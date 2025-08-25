#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAndCache } from './fetch-openapi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../src/lib/api/generated');
const TYPES_FILE = path.join(OUTPUT_DIR, 'types.ts');
const CLIENT_FILE = path.join(OUTPUT_DIR, 'client.ts');
const HOOKS_FILE = path.join(OUTPUT_DIR, 'hooks.ts');

/**
 * Ensures output directory exists
 */
function ensureOutputDir() {
  try {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

/**
 * Generates TypeScript types from OpenAPI spec
 */
function generateTypes(spec) {
  console.log('🔄 Generating TypeScript types...');
  
  // Write spec to temporary file for openapi-typescript
  const specFile = path.join(__dirname, '..', 'openapi-cache', 'openapi.json');
  
  try {
    // Run openapi-typescript to generate types
    execSync(`npx openapi-typescript ${specFile} --output ${TYPES_FILE}`, {
      stdio: 'inherit'
    });
    
    console.log('✅ TypeScript types generated');
  } catch (error) {
    throw new Error(`Failed to generate TypeScript types: ${error.message}`);
  }
}

/**
 * Generates openapi-fetch client
 */
function generateClient() {
  console.log('🔄 Generating API client...');
  
  const clientContent = `// Generated API client - do not edit manually
import createClient from 'openapi-fetch';
import type { paths } from './types';

// Create the main API client
export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL || (
    process.env.NODE_ENV === 'production' 
      ? '/api'  // Production: assume API is served from same origin
      : 'http://localhost:5000'  // Development: backend on different port
  ),
});

// Export types for convenience
export type * from './types';
`;
  
  writeFileSync(CLIENT_FILE, clientContent);
  console.log('✅ API client generated');
}

/**
 * Generates TanStack Query hooks from OpenAPI spec
 */
function generateHooks(spec) {
  console.log('🔄 Generating TanStack Query hooks...');
  
  const hooks = [];
  const imports = new Set(['useQuery', 'useMutation', 'useQueryClient']);
  
  // Generate type aliases from schema titles
  const { typeAliases, typeMap, parameterTypeMap } = generateTypeAliases(spec);
  
  // Process each path in the OpenAPI spec
  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!operation.operationId) continue;
      
      const operationId = operation.operationId;
      const summary = operation.summary || '';
      const isQuery = method.toLowerCase() === 'get';
      const isMutation = ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase());
      
      if (isQuery) {
        hooks.push(generateQueryHook(path, method, operation, operationId, summary, spec, typeMap, parameterTypeMap));
      } else if (isMutation) {
        hooks.push(generateMutationHook(path, method, operation, operationId, summary, spec, typeMap, parameterTypeMap));
      }
    }
  }
  
  const hooksContent = `// Generated TanStack Query hooks - do not edit manually
import { ${Array.from(imports).join(', ')} } from '@tanstack/react-query';
import { api } from './client';
import type { paths, components } from './types';

// Type aliases for better developer experience
${typeAliases.join('\n')}

${hooks.join('\n\n')}
`;
  
  writeFileSync(HOOKS_FILE, hooksContent);
  console.log('✅ TanStack Query hooks generated');
}

/**
 * Generates a React Query hook for GET requests
 */
function generateQueryHook(path, method, operation, operationId, summary, spec, typeMap, parameterTypeMap) {
  const transformedOperationId = transformOperationId(operationId);
  const hookName = `use${capitalize(transformedOperationId)}`;
  const pathParams = extractPathParams(path);
  const hasParams = pathParams.length > 0 || (operation.parameters && operation.parameters.length > 0);
  
  let paramsType = 'void';
  let paramsArg = '';
  let pathWithParams = `'${path}' as const`;
  let queryOptions = '';
  
  if (hasParams) {
    const parameterTypeAlias = parameterTypeMap.get(`${path}:${method}`);
    paramsType = parameterTypeAlias || `paths['${path}']['${method}']['parameters']`;
    paramsArg = `params: ${paramsType}`;
    
    if (pathParams.length > 0) {
      pathWithParams = `'${path}'`;
    }
    
    queryOptions = ', { params }';
  }
  
  const optionsType = hasParams 
    ? `Omit<Parameters<typeof useQuery>[0], 'queryKey' | 'queryFn'>`
    : `Omit<Parameters<typeof useQuery>[0], 'queryKey' | 'queryFn'>`;
  
  const responseType = getFriendlyType(spec, path, method, 'response', typeMap);
  
  return `/**
 * ${summary || `${method.toUpperCase()} ${path}`}
 */
export function ${hookName}(${paramsArg}${hasParams ? ', ' : ''}options?: ${optionsType}): ReturnType<typeof useQuery<${responseType}>> {
  return useQuery({
    queryKey: ['${transformedOperationId}'${hasParams ? ', params' : ''}],
    queryFn: async () => {
      const { data, error } = await api.${method.toUpperCase()}(${pathWithParams}${queryOptions});
      if (error) throw error;
      return data;
    },
    ...options
  });
}`;
}

/**
 * Generates a React Query mutation hook for POST/PUT/PATCH/DELETE requests
 */
function generateMutationHook(path, method, operation, operationId, summary, spec, typeMap, parameterTypeMap) {
  const transformedOperationId = transformOperationId(operationId);
  const hookName = `use${capitalize(transformedOperationId)}`;
  const pathParams = extractPathParams(path);
  const hasBody = operation.requestBody;
  const hasPathParams = pathParams.length > 0;
  
  let variablesType = 'void';
  let pathWithParams = `'${path}' as const`;
  let mutationArgs = '';
  
  if (hasPathParams || hasBody) {
    const parts = [];
    if (hasPathParams) {
      const parameterTypeAlias = parameterTypeMap.get(`${path}:${method}`);
      if (parameterTypeAlias) {
        parts.push(`path: ${parameterTypeAlias}['path']`);
      } else {
        parts.push(`path: paths['${path}']['${method}']['parameters']['path']`);
      }
    }
    if (hasBody) {
      const bodyType = getFriendlyType(spec, path, method, 'requestBody', typeMap);
      parts.push(`body: ${bodyType}`);
    }
    variablesType = `{ ${parts.join('; ')} }`;
    
    if (hasPathParams) {
      pathWithParams = `'${path}'`;
    }
    
    // Build mutation arguments
    const argParts = [];
    if (hasPathParams) {
      argParts.push('params: { path: variables.path }');
    }
    if (hasBody) {
      argParts.push('body: variables.body');
    }
    mutationArgs = argParts.length > 0 ? `, { ${argParts.join(', ')} }` : '';
  }
  
  const responseType = getFriendlyType(spec, path, method, 'response', typeMap);
  
  return `/**
 * ${summary || `${method.toUpperCase()} ${path}`}
 */
export function ${hookName}(options?: Omit<Parameters<typeof useMutation>[0], 'mutationFn'>): ReturnType<typeof useMutation<${responseType}, Error, ${variablesType}>> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (variables: ${variablesType}) => {
      const { data, error } = await api.${method.toUpperCase()}(${pathWithParams}${mutationArgs});
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate relevant queries after successful mutation
      queryClient.invalidateQueries();
    },
    ...options
  });
}`;
}

/**
 * Extracts path parameters from an OpenAPI path
 */
function extractPathParams(path) {
  const matches = path.match(/\{([^}]+)\}/g);
  return matches ? matches.map(match => match.slice(1, -1)) : [];
}

/**
 * Capitalizes the first letter of a string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Extracts parameter names from operationId
 */
function extractParameters(operationId) {
  const matches = operationId.match(/\{([^}]+)\}/g);
  return matches ? matches.map(match => match.slice(1, -1)) : [];
}

/**
 * Converts underscore-separated strings to camelCase
 */
function toCamelCase(str) {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Transforms operationId using custom naming pattern
 */
function transformOperationId(operationId) {
  // Extract parameters
  const parameters = extractParameters(operationId);
  
  // Replace parameter patterns with single underscore and remove __api
  let baseName = operationId.replace(/\{[^}]+\}/g, '_');
  baseName = baseName.replace(/__api/g, '');
  
  // Clean up multiple consecutive underscores
  baseName = baseName.replace(/_+/g, '_');
  baseName = baseName.replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  // Create parameter suffix if parameters exist
  let parameterSuffix = '';
  if (parameters.length > 0) {
    parameterSuffix = '_by_' + parameters.join('_and_');
  }
  
  // Concatenate base name + parameter suffix
  const fullName = baseName + parameterSuffix;
  
  // Convert to camelCase
  return toCamelCase(fullName);
}

/**
 * Generates user-friendly type aliases from OpenAPI schemas and parameters
 */
function generateTypeAliases(spec) {
  const typeAliases = [];
  const typeMap = new Map();
  const parameterTypeMap = new Map();
  
  // Extract schemas and create aliases based on unique schema keys
  if (spec.components && spec.components.schemas) {
    for (const [schemaKey, schema] of Object.entries(spec.components.schemas)) {
      if (schema.title) {
        // Convert schema key to a valid TypeScript identifier
        // Replace dots and special characters with underscores
        const aliasName = schemaKey.replace(/[^a-zA-Z0-9]/g, '_');
        const longTypePath = `components['schemas']['${schemaKey}']`;
        
        typeAliases.push(`export type ${aliasName} = ${longTypePath};`);
        typeMap.set(schemaKey, aliasName);
      }
    }
  }
  
  // Generate parameter type aliases for each operation
  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!operation.operationId) continue;
      
      const transformedOperationId = transformOperationId(operation.operationId);
      const pathParams = extractPathParams(path);
      const hasParams = pathParams.length > 0 || (operation.parameters && operation.parameters.length > 0);
      
      if (hasParams) {
        const parameterTypeName = `${capitalize(transformedOperationId)}Parameters`;
        const parameterTypePath = `paths['${path}']['${method}']['parameters']`;
        
        typeAliases.push(`export type ${parameterTypeName} = ${parameterTypePath};`);
        parameterTypeMap.set(`${path}:${method}`, parameterTypeName);
      }
    }
  }
  
  return { typeAliases, typeMap, parameterTypeMap };
}

/**
 * Finds the schema reference for a specific path/method/type combination
 */
function findSchemaReference(spec, path, method, type) {
  try {
    const pathItem = spec.paths[path];
    if (!pathItem) return null;
    
    const operation = pathItem[method];
    if (!operation) return null;
    
    if (type === 'response') {
      // Check for success response codes (200-299)
      if (operation.responses) {
        const responseCodes = Object.keys(operation.responses)
          .map(code => parseInt(code, 10))
          .filter(code => !isNaN(code) && code >= 200 && code < 300)
          .sort((a, b) => a - b);
        
        for (const code of responseCodes) {
          const response = operation.responses[code.toString()];
          const schema = response.content?.['application/json']?.schema;
          if (schema && schema.$ref) {
            return {
              schemaRef: schema.$ref.replace('#/components/schemas/', ''),
              statusCode: code.toString()
            };
          }
        }
      }
    } else if (type === 'requestBody') {
      const requestBody = operation.requestBody;
      const schema = requestBody?.content?.['application/json']?.schema;
      if (schema && schema.$ref) {
        return {
          schemaRef: schema.$ref.replace('#/components/schemas/', ''),
          statusCode: null
        };
      }
    }
  } catch (error) {
    // Ignore errors and fall back to long path
  }
  
  return null;
}

/**
 * Gets a friendly type alias or falls back to the original type path
 */
function getFriendlyType(spec, path, method, type, typeMap) {
  const result = findSchemaReference(spec, path, method, type);
  
  if (result && result.schemaRef && typeMap.has(result.schemaRef)) {
    return typeMap.get(result.schemaRef);
  }
  
  // For responses, check if any success response exists, otherwise assume void
  if (type === 'response') {
    const operation = spec.paths[path]?.[method];
    if (operation?.responses) {
      // Get actual response codes, filter for success (200-299), and sort
      const responseCodes = Object.keys(operation.responses)
        .map(code => parseInt(code, 10))
        .filter(code => !isNaN(code) && code >= 200 && code < 300)
        .sort((a, b) => a - b);
      
      for (const code of responseCodes) {
        const response = operation.responses[code.toString()];
        if (response.content?.['application/json']) {
          // Has content, use the long path with the actual status code
          return `NonNullable<paths['${path}']['${method}']['responses']['${code}']['content']['application/json']>`;
        } else {
          // No content, return void for operations that don't return data
          return 'void';
        }
      }
    }
    // No success response found, assume void
    return 'void';
  } else if (type === 'requestBody') {
    return `NonNullable<paths['${path}']['${method}']['requestBody']>['content']['application/json']`;
  }
  
  return 'void';
}

/**
 * Main generation function
 */
async function generateAPI(options = {}) {
  const { fetchMode = false, buildMode = false } = options;
  
  try {
    console.log('🚀 Starting API code generation...');
    
    // Ensure output directory exists
    ensureOutputDir();
    
    // Fetch or load OpenAPI spec
    const spec = await fetchAndCache({ 
      forceRefresh: fetchMode, 
      buildMode: buildMode 
    });
    
    // Generate all the files
    generateTypes(spec);
    generateClient();
    generateHooks(spec);
    
    console.log('✅ API code generation completed successfully!');
    console.log(`   Generated files:`);
    console.log(`   - ${TYPES_FILE}`);
    console.log(`   - ${CLIENT_FILE}`);
    console.log(`   - ${HOOKS_FILE}`);
    
  } catch (error) {
    console.error('❌ API generation failed:', error.message);
    throw error;
  }
}

// CLI usage
if (process.argv[1] === __filename) {
  const args = process.argv.slice(2);
  const fetchMode = args.includes('--fetch');
  const buildMode = args.includes('--cache-only');
  
  generateAPI({ fetchMode, buildMode })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { generateAPI };