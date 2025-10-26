import { expect } from '@playwright/test';
import { test } from '../../support/fixtures';
import { waitForListLoading, waitTestEvent } from '../../support/helpers';
import type { FormTestEvent, ToastTestEvent } from '@/types/test-events';
import type { PartKitReservationsResponseSchema_d12d9a5 } from '@/lib/api/generated/hooks';

test.describe('Kits overview', () => {
  test('shows shopping and pick list indicators with tooltip details', async ({ kits, apiClient, page, testData }) => {
    // Seed a dedicated kit with predictable stock so indicator flows never race existing data.
    const indicatorPartDescription = testData.parts.randomPartDescription('Indicator Part');
    const { part } = await testData.parts.create({
      overrides: { description: indicatorPartDescription },
    });

    const partReservations = await apiClient.apiRequest<PartKitReservationsResponseSchema_d12d9a5>(() =>
      apiClient.GET('/api/parts/{part_key}/kit-reservations', {
        params: { path: { part_key: part.key } },
      })
    );
    const partId = partReservations.part_id;
    if (typeof partId !== 'number') {
      throw new Error('Failed to resolve part id for indicator kit seeding');
    }

    const stockBox = await testData.boxes.create({
      overrides: { description: 'Indicator Kit Box' },
    });
    const stockQuantity = 4;

    await apiClient.apiRequest(() =>
      apiClient.POST('/api/inventory/parts/{part_key}/stock', {
        params: { path: { part_key: part.key } },
        body: { box_no: stockBox.box_no, loc_no: 1, qty: stockQuantity },
      })
    );

    const kit = await testData.kits.create({
      overrides: {
        name: testData.kits.randomKitName('Indicator Kit'),
        build_target: 1,
      },
    });

    await testData.kits.addContent(kit.id, {
      partId,
      requiredPerUnit: 1,
    });

    const kitId = kit.id;

    const shoppingListName = testData.shoppingLists.randomName('Indicator Shopping');
    const requestedShoppingUnits = 6;
    await apiClient.apiRequest(() =>
      apiClient.POST('/api/kits/{kit_id}/shopping-lists', {
        params: { path: { kit_id: kitId } },
        body: {
          shopping_list_id: null,
          new_list_name: shoppingListName,
          new_list_description: null,
          honor_reserved: false,
          note_prefix: null,
          units: requestedShoppingUnits,
        },
      })
    );

    await apiClient.apiRequest(() =>
      apiClient.POST('/api/kits/{kit_id}/pick-lists', {
        params: { path: { kit_id: kitId } },
        body: { requested_units: 1 },
      })
    );

    const shoppingQuery = await apiClient.apiRequest(() =>
      apiClient.POST('/api/kits/shopping-list-memberships/query', {
        body: {
          kit_ids: [kitId],
          include_done: false,
        },
      })
    );

    const pickQuery = await apiClient.apiRequest(() =>
      apiClient.POST('/api/kits/pick-list-memberships/query', {
        body: {
          kit_ids: [kitId],
          include_done: false,
        },
      })
    );

    const shoppingMemberships = shoppingQuery.memberships?.[0]?.memberships ?? [];
    const pickMemberships = pickQuery.memberships?.[0]?.pick_lists ?? [];

    expect(shoppingMemberships.length, 'shopping memberships seeded for indicator').toBeGreaterThan(0);
    expect(pickMemberships.length, 'pick list memberships seeded for indicator').toBeGreaterThan(0);

    const expectedShoppingNames = shoppingMemberships.map((membership) => membership.shopping_list_name);
    const expectedShoppingStatuses = new Set(shoppingMemberships.map((membership) => membership.status));
    const expectedPickLabels = pickMemberships.map((membership) => `Pick list #${membership.id}`);

    await kits.gotoOverview();
    await expect(kits.cardById(kitId)).toBeVisible();

    await waitForListLoading(page, 'kits.list.memberships.shopping', 'ready');
    await waitForListLoading(page, 'kits.list.memberships.pick', 'ready');

    const shoppingIndicator = kits.shoppingIndicator(kitId);
    await expect(shoppingIndicator).toBeVisible();
    await shoppingIndicator.hover();
    const shoppingTooltip = kits.shoppingIndicatorTooltip(kitId);
    await expect(shoppingTooltip).toBeVisible();
    for (const name of expectedShoppingNames) {
      await expect(shoppingTooltip).toContainText(name);
    }
    for (const status of expectedShoppingStatuses) {
      await expect(shoppingTooltip).toContainText(status);
    }

    const pickIndicator = kits.pickIndicator(kitId);
    await expect(pickIndicator).toBeVisible();
    await pickIndicator.hover();
    const pickTooltip = kits.pickIndicatorTooltip(kitId);
    await expect(pickTooltip).toBeVisible();
    for (const label of expectedPickLabels) {
      await expect(pickTooltip).toContainText(label);
    }
    await expect(pickTooltip).toContainText('open');
    await expect(pickTooltip).toContainText('remaining');
  });

  test('lists kits across tabs with search persistence', async ({ kits, testData }) => {
    const [alpha, beta, archived] = await Promise.all([
      testData.kits.create({ overrides: { name: 'Alpha Synth Kit', build_target: 2 } }),
      testData.kits.create({ overrides: { name: 'Beta Drum Kit', build_target: 3 } }),
      testData.kits.create({ overrides: { name: 'Synth Archive Kit' }, archived: true }),
    ]);

    await kits.gotoOverview();
    await expect(kits.cardById(alpha.id)).toBeVisible();
    await expect(kits.cardById(beta.id)).toBeVisible();
    await kits.expectTabActive('active');

    await kits.search('Synth');
    await expect(kits.cardById(alpha.id)).toBeVisible();
    await expect(kits.cardById(beta.id)).toHaveCount(0);

    await kits.selectTab('archived');
    await expect(kits.overviewSearchInput).toHaveValue('Synth');
    await expect(kits.cardById(archived.id, 'archived')).toBeVisible();
  });

  test('archives a kit with undo toast flow', async ({ kits, testData, toastHelper, page }) => {
    const kit = await testData.kits.create({ overrides: { name: 'Undo Flow Kit' } });
    await kits.gotoOverview();

    const submitEventPromise = waitTestEvent<FormTestEvent>(page, 'form', (event) =>
      event.formId === 'KitLifecycle:archive' && event.phase === 'submit' && Number(event.metadata?.kitId) === kit.id,
    );
    const successEventPromise = waitTestEvent<FormTestEvent>(page, 'form', (event) =>
      event.formId === 'KitLifecycle:archive' && event.phase === 'success' && Number(event.metadata?.kitId) === kit.id,
    );
    const toastEventPromise = waitTestEvent<ToastTestEvent>(page, 'toast', (event) =>
      event.message.includes(kit.name) && event.action === 'undo',
    );

    await kits.archiveButton(kit.id).click();
    await submitEventPromise;
    await successEventPromise;
    await toastEventPromise;

    const undoToast = await toastHelper.waitForToastWithText(new RegExp(`Archived "${kit.name}"`));
    await expect(kits.cardById(kit.id)).toHaveCount(0);
    const archivedReady = waitForListLoading(page, 'kits.overview', 'ready');
    await kits.selectTab('archived');
    await archivedReady;
    await expect(kits.cardById(kit.id, 'archived')).toBeVisible();

    const undoSubmit = waitTestEvent<FormTestEvent>(page, 'form', (event) =>
      event.formId === 'KitLifecycle:unarchive' && event.phase === 'submit' && Number(event.metadata?.kitId) === kit.id && event.metadata?.undo === true,
    );
    const undoSuccess = waitTestEvent<FormTestEvent>(page, 'form', (event) =>
      event.formId === 'KitLifecycle:unarchive' && event.phase === 'success' && Number(event.metadata?.kitId) === kit.id && event.metadata?.undo === true,
    );
    const undoToastEvent = waitTestEvent<ToastTestEvent>(page, 'toast', (event) =>
      event.message.includes('Restored') && !event.action,
    );

    await undoToast.getByTestId(`kits.overview.toast.undo.${kit.id}`).click();
    await Promise.all([undoSubmit, undoSuccess, undoToastEvent]);

    const returnReady = waitForListLoading(page, 'kits.overview', 'ready');
    await kits.selectTab('active');
    await returnReady;
    await expect(kits.cardById(kit.id)).toBeVisible();
  });

  test('creates a kit through the overview modal', async ({ kits, testData, page, toastHelper }) => {
    await kits.gotoOverview();

    const openEvent = waitTestEvent<FormTestEvent>(page, 'form', (event) =>
      event.formId === 'KitOverview:create' && event.phase === 'open'
    );

    await kits.openCreateDialog();
    await openEvent;

    const validationEvent = waitTestEvent<FormTestEvent>(page, 'form', (event) =>
      event.formId === 'KitOverview:create' && event.phase === 'validation_error'
    );
    await kits.submitCreateForm();
    await validationEvent;
    await expect(kits.createForm.getByText('Name is required')).toBeVisible();

    const name = testData.kits.randomKitName('Modal Kit');
    const description = 'Created from kits overview modal';
    const buildTarget = 3;

    const submitEvent = waitTestEvent<FormTestEvent>(page, 'form', (event) =>
      event.formId === 'KitOverview:create' && event.phase === 'submit'
    );
    const successEventPromise = waitTestEvent<FormTestEvent>(page, 'form', (event) =>
      event.formId === 'KitOverview:create' && event.phase === 'success'
    );
    const toastEventPromise = waitTestEvent<ToastTestEvent>(page, 'toast', (event) =>
      event.message.includes(`Created kit "${name}"`)
    );

    await kits.fillCreateForm({ name, description, buildTarget });
    await kits.submitCreateForm();

    await submitEvent;
    const successEvent = await successEventPromise;
    await toastEventPromise;
    await toastHelper.expectSuccessToast(new RegExp(`Created kit "${name}"`));

    const createdKitId = Number(successEvent.metadata?.kitId);
    expect(createdKitId).toBeGreaterThan(0);

    await expect(kits.createDialog).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/kits/${createdKitId}(\\?.*)?$`));
  });
});
