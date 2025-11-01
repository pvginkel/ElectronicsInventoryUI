import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, KeyValueBadge } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { DetailScreenLayout } from '@/components/layout/detail-screen-layout';
import { PartLocationGrid } from './part-location-grid';
import { CoverImageDisplay } from '@/components/documents/cover-image-display';
import { PartDocumentGrid } from './part-document-grid';
import { AddDocumentModal } from '@/components/documents/add-document-modal';
import { ShoppingListLinkChip } from '@/components/shopping-lists/shopping-list-link-chip';
import { MoreVerticalIcon } from '@/components/icons/MoreVerticalIcon';
import { AddToShoppingListDialog } from '@/components/shopping-lists/part/add-to-shopping-list-dialog';
import { KitLinkChip } from '@/components/kits/kit-link-chip';
import {
  useGetPartsByPartKey,
  useDeletePartsByPartKey,
} from '@/lib/api/generated/hooks';
import { formatPartForDisplay } from '@/lib/utils/parts';
import { useConfirm } from '@/hooks/use-confirm';
import { useClipboardPaste } from '@/hooks/use-clipboard-paste';
import {
  invalidatePartMemberships,
  usePartShoppingListMemberships,
} from '@/hooks/use-part-shopping-list-memberships';
import {
  invalidatePartKitMemberships,
  usePartKitMemberships,
} from '@/hooks/use-part-kit-memberships';
import { useListLoadingInstrumentation } from '@/lib/test/query-instrumentation';

interface PartDetailsProps {
  partId: string;
}

export function PartDetails({ partId }: PartDetailsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, confirmProps } = useConfirm();

  const documentGridRef = useRef<HTMLDivElement>(null);
  const [latestUploadedDocumentId, setLatestUploadedDocumentId] = useState<number | null>(null);
  const [documentKey, setDocumentKey] = useState(0);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showAddToListDialog, setShowAddToListDialog] = useState(false);

  const membershipQuery = usePartShoppingListMemberships(partId);
  const memberships = membershipQuery.summary.memberships;

  const kitMembershipQuery = usePartKitMemberships(partId);
  const kitMemberships = kitMembershipQuery.summary.kits;
  const activeKitMemberships = useMemo(
    () => kitMemberships.filter((kit) => kit.status === 'active'),
    [kitMemberships],
  );
  const archivedKitMemberships = useMemo(
    () => kitMemberships.filter((kit) => kit.status === 'archived'),
    [kitMemberships],
  );

  const {
    data: part,
    isLoading: isPartLoading,
    isFetching: isPartFetching,
    error: partError,
  } = useGetPartsByPartKey(
    { path: { part_key: partId } },
    { enabled: Boolean(partId) },
  );

  const deletePartMutation = useDeletePartsByPartKey();

  useClipboardPaste({
    partId,
    enabled: Boolean(partId),
    onUploadSuccess: (documentId) => {
      setDocumentKey((prev) => prev + 1);
      setLatestUploadedDocumentId(documentId);
    },
  });

  useEffect(() => {
    if (!latestUploadedDocumentId) {
      return;
    }

    const scrollTimeout = setTimeout(() => {
      if (!documentGridRef.current) {
        return;
      }

      const targetTile = documentGridRef.current.querySelector(
        `[data-document-id="${latestUploadedDocumentId}"]`,
      ) as HTMLElement | null;

      if (!targetTile) {
        return;
      }

      targetTile.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });

      targetTile.style.transition = 'box-shadow 0.3s ease';
      targetTile.style.boxShadow = '0 0 0 2px rgb(59, 130, 246)';

      setTimeout(() => {
        targetTile.style.boxShadow = '';
      }, 2000);
    }, 500);

    return () => clearTimeout(scrollTimeout);
  }, [latestUploadedDocumentId]);

  const partSummary = useMemo(() => {
    if (!part) {
      return null;
    }

    const numericId = (part as { id?: number | null }).id ?? null;
    return {
      id: numericId,
      key: part.key,
      description: part.description,
      defaultSellerId: part.seller?.id ?? null,
    };
  }, [part]);

  const activeShoppingMemberships = useMemo(() => {
    const seen = new Set<number>();
    const unique = [] as typeof memberships;

    for (const membership of memberships) {
      if (!seen.has(membership.listId)) {
        seen.add(membership.listId);
        unique.push(membership);
      }
    }

    return unique;
  }, [memberships]);

  const isMembershipPending = membershipQuery.status === 'pending';
  const isMembershipFetching = membershipQuery.fetchStatus === 'fetching';
  const membershipError = membershipQuery.error;
  const showMembershipSkeleton =
    isMembershipPending ||
    (isMembershipFetching && membershipQuery.status === 'success');

  const isKitPending = kitMembershipQuery.status === 'pending';
  const isKitFetching = kitMembershipQuery.fetchStatus === 'fetching';
  const kitMembershipError = kitMembershipQuery.error;
  const showKitMembershipSkeleton =
    isKitPending || (isKitFetching && kitMembershipQuery.status === 'success');

  useListLoadingInstrumentation({
    scope: 'parts.detail',
    isLoading: isPartLoading,
    isFetching: isPartFetching,
    error: partError,
    getReadyMetadata: () =>
      part
        ? {
            status: 'success',
            partKey: part.key,
            hasCoverAttachment: Boolean(part.cover_attachment),
            typeId: part.type_id ?? null,
          }
        : undefined,
    getErrorMetadata: (error) => ({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      partKey: partId,
    }),
    getAbortedMetadata: () => ({
      status: 'aborted',
      partKey: partId,
    }),
  });

  useListLoadingInstrumentation({
    scope: 'parts.detail.shoppingLists',
    isLoading: isMembershipPending,
    isFetching: isMembershipFetching,
    error: membershipError,
    getReadyMetadata: () => ({
      status: 'success',
      partKey: part?.key ?? partId,
      memberships: memberships.length,
      activeMemberships: activeShoppingMemberships.length,
    }),
    getErrorMetadata: (error) => ({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      partKey: part?.key ?? partId,
    }),
    getAbortedMetadata: () => ({
      status: 'aborted',
      partKey: part?.key ?? partId,
    }),
  });

  const handleDeletePart = async () => {
    if (!part) {
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Part',
      description: `Are you sure you want to delete part ${partId} (${part.description})? This action cannot be undone and will only succeed if the part has zero total quantity.`,
      confirmText: 'Delete',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    await deletePartMutation.mutateAsync({
      path: { part_key: partId },
    });

    navigate({ to: '/parts' });
  };

  const handleDuplicatePart = () => {
    navigate({ to: '/parts/new', search: { duplicate: partId } });
  };

  const handleEditPart = () => {
    navigate({ to: '/parts/$partId/edit', params: { partId } });
  };

  const formattedPart = part ? formatPartForDisplay(part) : null;
  const hasCoverAttachment = Boolean(part?.cover_attachment);

  const breadcrumbs = (
    <>
      <Link to="/parts" className="hover:text-foreground">
        Parts
      </Link>
      <span>/</span>
      <span>{part?.key ?? partId}</span>
    </>
  );

  const metadataRow = part ? (
    <>
      <KeyValueBadge
        label="Type"
        value={part.type?.name ?? 'Unassigned'}
        color="neutral"
        testId="parts.detail.metadata.type"
      />
      <KeyValueBadge
        label="Created"
        value={new Date(part.created_at).toLocaleDateString()}
        color="neutral"
        testId="parts.detail.metadata.created"
      />
    </>
  ) : null;

  const actions = part ? (
    <>
      <Button variant="outline" onClick={handleEditPart} data-testid="parts.detail.actions.edit">
        Edit Part
      </Button>
      <Button
        variant="outline"
        onClick={handleDeletePart}
        disabled={deletePartMutation.isPending}
        data-testid="parts.detail.actions.delete"
      >
        Delete Part
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" data-testid="parts.detail.actions.menu" aria-label="More Actions">
            <MoreVerticalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setShowAddToListDialog(true)}
            data-testid="parts.detail.actions.add-to-shopping-list"
          >
            Order Stock
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicatePart}>Duplicate Part</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  ) : null;

  const showLinkBadgeSkeleton = showMembershipSkeleton || showKitMembershipSkeleton;

  const handleLinkBadgeRetry = () => {
    if (membershipError) {
      invalidatePartMemberships(queryClient, partId);
      void membershipQuery.refetch();
    }
    if (kitMembershipError) {
      invalidatePartKitMemberships(queryClient, partId);
      void kitMembershipQuery.refetch();
    }
  };

  const renderLinkBadges = () => {
    if (showLinkBadgeSkeleton) {
      return (
        <div
          className="flex flex-wrap gap-2"
          data-testid="parts.detail.link.badges.loading"
        >
          <div className="h-6 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
        </div>
      );
    }

    if (membershipError || kitMembershipError) {
      const shoppingMessage = membershipError instanceof Error
        ? membershipError.message
        : membershipError
          ? String(membershipError)
          : null;
      const kitMessage = kitMembershipError instanceof Error
        ? kitMembershipError.message
        : kitMembershipError
          ? String(kitMembershipError)
          : null;

      return (
        <Alert
          variant="error"
          icon={true}
          testId="parts.detail.link.badges.error"
          action={
            <Button type="button" size="sm" variant="outline" onClick={handleLinkBadgeRetry}>
              Reload Data
            </Button>
          }
        >
          <div className="space-y-1">
            <span>Failed to load linked list and kit data.</span>
            <ul className="list-disc pl-4 text-xs text-muted-foreground">
              {shoppingMessage ? <li>Shopping lists: {shoppingMessage}</li> : null}
              {kitMessage ? <li>Kits: {kitMessage}</li> : null}
            </ul>
          </div>
        </Alert>
      );
    }

    const hasShoppingMemberships = activeShoppingMemberships.length > 0;
    const hasKitMemberships = kitMemberships.length > 0;

    if (!hasShoppingMemberships && !hasKitMemberships) {
      return (
        <p
          className="text-sm text-muted-foreground"
          data-testid="parts.detail.link.badges.empty"
        >
          This part is not on Concept or Ready shopping lists and is not used in any kits.
        </p>
      );
    }

    return (
      <div
        className="flex flex-wrap gap-2"
        data-testid="parts.detail.link.badges.content"
      >
        {activeShoppingMemberships.map((membership) => (
          <ShoppingListLinkChip
            key={membership.listId}
            listId={membership.listId}
            name={membership.listName}
            status={membership.listStatus}
            testId="parts.detail.shopping-list.badge"
            iconTestId="parts.detail.shopping-list.badge.icon"
          />
        ))}
        {activeKitMemberships.map((kit) => (
          <KitLinkChip
            key={`kit-active-${kit.kitId}`}
            kitId={kit.kitId}
            name={kit.kitName}
            status={kit.status}
            testId="parts.detail.kit.badge"
            iconTestId="parts.detail.kit.badge.icon"
          />
        ))}
        {archivedKitMemberships.map((kit) => (
          <KitLinkChip
            key={`kit-archived-${kit.kitId}`}
            kitId={kit.kitId}
            name={kit.kitName}
            status={kit.status}
            testId="parts.detail.kit.badge"
            iconTestId="parts.detail.kit.badge.icon"
          />
        ))}
      </div>
    );
  };

  const detailBody = (() => {
    if (isPartLoading) {
      return (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-1/3 rounded bg-muted" />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="h-4 rounded bg-muted" />
                <div className="h-4 rounded bg-muted" />
                <div className="h-4 rounded bg-muted" />
                <div className="h-4 rounded bg-muted" />
              </div>
            </div>
          </Card>
        </div>
      );
    }

    if (partError || !part || !formattedPart) {
      return (
        <Card className="p-6">
          <div className="text-center">
            <h2 className="mb-2 text-lg font-semibold">Part not found</h2>
            <p className="text-muted-foreground">
              The part with ID "{partId}" could not be found.
            </p>
          </div>
        </Card>
      );
    }

    const { displayId, displayManufacturerCode, displayManufacturer, displayProductPage } =
      formattedPart;

    return (
      <div className="space-y-6">
        <div
          id="parts.detail.link.badges"
          data-testid="parts.detail.link.badges"
          className="min-h-[32px]"
        >
          {renderLinkBadges()}
        </div>

        <div
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          data-testid="parts.detail.summary-grid"
        >
          <div className="lg:col-span-1">
            <Card data-testid="parts.detail.information">
              <CardHeader>
                <CardTitle>Part Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium">Part ID</div>
                    <div className="font-mono text-2xl font-bold">{displayId}</div>
                  </div>
                  <CoverImageDisplay
                    partId={partId}
                    hasCoverAttachment={hasCoverAttachment}
                    size="medium"
                    className="ml-4"
                    showPlaceholder={false}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    {(displayManufacturer || displayProductPage) && (
                      <div>
                        <div className="mb-2 text-xs font-medium text-muted-foreground">
                          Manufacturer Information
                        </div>
                        <div className="space-y-2">
                          {displayManufacturer ? (
                            <div>
                              <div className="text-sm font-medium">Manufacturer</div>
                              <div className="text-lg">{displayManufacturer}</div>
                            </div>
                          ) : null}

                          {displayProductPage ? (
                            <div>
                              <div className="text-sm font-medium">Product Page</div>
                              <div className="text-sm">
                                <a
                                  href={displayProductPage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="break-all text-blue-600 underline hover:text-blue-800"
                                >
                                  {displayProductPage}
                                </a>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {(part.seller || part.seller_link) && (
                      <div>
                        <div className="mb-2 text-xs font-medium text-muted-foreground">
                          Seller Information
                        </div>
                        <div className="space-y-2">
                          {part.seller ? (
                            <div>
                              <div className="text-sm font-medium">Seller</div>
                              <div className="text-lg">{part.seller.name}</div>
                            </div>
                          ) : null}

                          {part.seller_link ? (
                            <div>
                              <div className="text-sm font-medium">Product Page</div>
                              <div className="text-sm">
                                <a
                                  href={part.seller_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="break-all text-blue-600 underline hover:text-blue-800"
                                >
                                  {part.seller_link}
                                </a>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {displayManufacturerCode ? (
                      <div>
                        <div className="text-sm font-medium">Manufacturer Code</div>
                        <div className="text-lg">{displayManufacturerCode}</div>
                      </div>
                    ) : null}

                    <div>
                      <div className="text-sm font-medium">Type</div>
                      <div className="text-lg">
                        {part.type?.name ?? 'No type assigned'}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium">Tags</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {part.tags && part.tags.length > 0 ? (
                          part.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No tags</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium">Created</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(part.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {(part.dimensions ||
                    part.mounting_type ||
                    part.package ||
                    part.pin_count ||
                    part.pin_pitch ||
                    part.series ||
                    part.voltage_rating ||
                    part.input_voltage ||
                    part.output_voltage) && (
                    <div>
                      <div className="mb-3 text-sm font-medium">Technical Specifications</div>

                      {(part.dimensions ||
                        part.package ||
                        part.pin_count ||
                        part.pin_pitch ||
                        part.mounting_type) && (
                        <div className="mb-4">
                          <div className="mb-2 text-xs font-medium text-muted-foreground">
                            Physical
                          </div>
                          <div className="space-y-2">
                            {part.dimensions ? (
                              <div>
                                <div className="text-sm font-medium">Dimensions</div>
                                <div className="text-sm">{part.dimensions}</div>
                              </div>
                            ) : null}

                            {part.package ? (
                              <div>
                                <div className="text-sm font-medium">Package</div>
                                <div className="text-sm">{part.package}</div>
                              </div>
                            ) : null}

                            {part.pin_count ? (
                              <div>
                                <div className="text-sm font-medium">Pin Count</div>
                                <div className="text-sm">{part.pin_count}</div>
                              </div>
                            ) : null}

                            {part.pin_pitch ? (
                              <div>
                                <div className="text-sm font-medium">Pin Pitch</div>
                                <div className="text-sm">{part.pin_pitch}</div>
                              </div>
                            ) : null}

                            {part.mounting_type ? (
                              <div>
                                <div className="text-sm font-medium">Mounting Type</div>
                                <div className="text-sm">{part.mounting_type}</div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {(part.voltage_rating ||
                        part.input_voltage ||
                        part.output_voltage ||
                        part.series) && (
                        <div className="mb-4">
                          <div className="mb-2 text-xs font-medium text-muted-foreground">
                            Electrical / Technical
                          </div>
                          <div className="space-y-2">
                            {part.voltage_rating ? (
                              <div>
                                <div className="text-sm font-medium">Voltage Rating</div>
                                <div className="text-sm">{part.voltage_rating}</div>
                              </div>
                            ) : null}

                            {part.input_voltage ? (
                              <div>
                                <div className="text-sm font-medium">Input Voltage</div>
                                <div className="text-sm">{part.input_voltage}</div>
                              </div>
                            ) : null}

                            {part.output_voltage ? (
                              <div>
                                <div className="text-sm font-medium">Output Voltage</div>
                                <div className="text-sm">{part.output_voltage}</div>
                              </div>
                            ) : null}

                            {part.series ? (
                              <div>
                                <div className="text-sm font-medium">Series</div>
                                <div className="text-sm">{part.series}</div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card data-testid="parts.detail.locations">
              <CardHeader>
                <CardTitle>Stock Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <PartLocationGrid partId={partId} typeId={part.type_id ?? undefined} />
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-6" data-testid="parts.detail.documents">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Button
                onClick={() => setShowAddDocument(true)}
                size="sm"
                data-testid="parts.detail.documents.add"
              >
                Add Document
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={documentGridRef}>
              <PartDocumentGrid
                key={documentKey}
                partId={partId}
                hasCoverAttachment={hasCoverAttachment}
                onDocumentChange={() => setDocumentKey((prev) => prev + 1)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  })();

  const detailTitle =
    formattedPart?.displayDescription ??
    part?.description ??
    (isPartLoading ? 'Loading part…' : 'Part details');

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="parts.detail">
      <DetailScreenLayout
        rootTestId="parts.detail.layout"
        headerTestId="parts.detail.header"
        contentTestId="parts.detail.content"
        footerTestId="parts.detail.footer"
        actionsTestId="parts.detail.actions"
        breadcrumbs={breadcrumbs}
        title={detailTitle}
        titleMetadata={
          formattedPart?.displayId ? (
            <Badge variant="outline" className="text-sm px-3 py-1">#{formattedPart.displayId}</Badge>
          ) : null
        }
        supplementary={
          hasCoverAttachment ? (
            <span className="text-sm text-muted-foreground">
              Cover image available
            </span>
          ) : null
        }
        metadataRow={metadataRow}
        actions={actions}
      >
        {detailBody}
      </DetailScreenLayout>

      {partSummary ? (
        <AddToShoppingListDialog
          open={showAddToListDialog}
          onClose={() => setShowAddToListDialog(false)}
          part={partSummary}
          defaultNeeded={1}
        />
      ) : null}

      <AddDocumentModal
        partId={partId}
        open={showAddDocument}
        onOpenChange={setShowAddDocument}
        onDocumentAdded={() => setDocumentKey((prev) => prev + 1)}
      />

      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
