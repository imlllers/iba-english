import {
  ActionIcon, Alert, Box, Button, Checkbox, Grid, Group, Image, Modal, Popover, Stack,
  Menu, NavLink, Text, TextInput, Tooltip, UnstyledButton,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HeaderSlotContext } from "@/app/layout/headerSlot";
import type { MediaFolder, MediaKind } from "@/entities/media/types";
import { MediaAudioPlayer } from "@/features/media-library/MediaAudioPlayer";
import { mediaApi, mediaKindOf, teacherMediaUrl } from "@/features/media-library/mediaApi";
import { errorMessage } from "@/shared/api/client";
import { formatBytes, formatDate } from "@/shared/lib/format";
import { useDebounced } from "@/shared/lib/useDebounced";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Icon } from "@/shared/ui/Icon";
import { Loading } from "@/shared/ui/Loading";
import { IconButton } from "@/shared/ui/IconButton";
import { notify } from "@/shared/ui/notify";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Pagination } from "@/shared/ui/Pagination";
import { Select } from "@/shared/ui/Select";
import { SettingsCard } from "@/shared/ui/SettingsCard";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { SettingsSectionTitle } from "@/shared/ui/SettingsSectionTitle";

const SIZE = 20;
const ALL_CHUNK = 100;
const MOVE_ROOT = "__root__";
const ROOT_KEY = "";

function kindLabel(type: ReturnType<typeof mediaKindOf>) {
  if (type === "image") return "Изображение";
  if (type === "audio") return "Аудио";
  if (type === "video") return "Видео";
  return "Файл";
}

type Removing =
  | { kind: "folder"; id: string; name: string }
  | { kind: "files"; ids: string[] };

export function MediaPage() {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const renameInput = useRef<HTMLInputElement>(null);
  const skipRenameBlur = useRef(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<MediaKind | "">("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [removing, setRemoving] = useState<Removing | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [selectingAll, setSelectingAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [preview, setPreview] = useState<{ src: string; name: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const search = useDebounced(q.trim());
  const list = useQuery({
    queryKey: ["media", { folderId, search, kind, page }],
    queryFn: () => mediaApi.list({ folderId, q: search, kind, page, size: SIZE }),
    placeholderData: (previous) => previous,
  });
  const folderTree = useQuery({ queryKey: ["media", "folders"], queryFn: mediaApi.folders });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["media"] });

  useEffect(() => {
    setSelected(new Set());
  }, [folderId, search, kind]);

  useEffect(() => {
    const path = list.data?.path ?? [];
    if (path.length === 0) return;
    setExpanded((current) => {
      const next = new Set(current);
      for (const item of path) next.add(item.id);
      return next;
    });
  }, [list.data?.path]);

  useEffect(() => {
    if (!renamingId || !renameInput.current) return;
    renameInput.current.focus();
    renameInput.current.select();
  }, [renamingId]);

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) await mediaApi.upload(file, folderId);
    },
    onError: (error) => notify.error(errorMessage(error, "Не удалось загрузить файл")),
    onSettled: invalidate,
  });
  const createFolder = useMutation({
    mutationFn: (name: string) => mediaApi.createFolder(name, folderId),
    onSuccess: () => {
      setCreating(false);
      setCreateName("");
      if (folderId) setExpanded((current) => new Set(current).add(folderId));
      invalidate();
    },
  });
  const renameFolder = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => mediaApi.renameFolder(id, name),
    onSuccess: () => {
      setRenamingId(null);
      setRenameValue("");
      invalidate();
    },
    onError: (error) => notify.error(errorMessage(error, "Не удалось переименовать папку")),
  });
  const removeFolder = useMutation({
    mutationFn: (id: string) => mediaApi.deleteFolder(id),
    onSuccess: (_, id) => {
      setRemoving(null);
      if (id === folderId) setFolderId(null);
      invalidate();
    },
  });
  const bulkMove = useMutation({
    mutationFn: async ({ ids, target }: { ids: string[]; target: string | null }) => {
      for (const id of ids) await mediaApi.moveAsset(id, target);
    },
    onSuccess: () => setSelected(new Set()),
    onError: (error) => notify.error(errorMessage(error, "Не удалось переместить")),
    onSettled: invalidate,
  });
  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await mediaApi.deleteAsset(id);
    },
    onSuccess: () => {
      setSelected(new Set());
      setRemoving(null);
    },
    onSettled: invalidate,
  });

  const data = list.data;
  const items = data?.items ?? [];
  const searching = Boolean(data?.searching);
  const allFolders = folderTree.data ?? [];
  const busy = upload.isPending || createFolder.isPending || renameFolder.isPending
    || removeFolder.isPending || bulkMove.isPending || bulkDelete.isPending;
  const selectedCount = selected.size;
  const total = data?.total ?? 0;
  const allSelected = total > 0 && selectedCount >= total;

  const children = useMemo(() => {
    const map = new Map<string, MediaFolder[]>();
    for (const folder of allFolders) {
      const key = folder.parentId ?? ROOT_KEY;
      map.set(key, [...(map.get(key) ?? []), folder]);
    }
    return map;
  }, [allFolders]);

  const moveOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    if (folderId !== null || searching) options.push({ value: MOVE_ROOT, label: "Все материалы" });
    const walk = (parent: string, prefix: string) => {
      for (const folder of children.get(parent) ?? []) {
        const label = prefix ? `${prefix} / ${folder.name}` : folder.name;
        if (folder.id !== folderId || searching) options.push({ value: folder.id, label });
        walk(folder.id, label);
      }
    };
    walk(ROOT_KEY, "");
    return options;
  }, [children, folderId, searching]);

  const openFolder = (id: string | null) => {
    setFolderId(id);
    setPage(0);
    setQ("");
  };

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const beginRename = (folder: MediaFolder) => {
    skipRenameBlur.current = false;
    setRenamingId(folder.id);
    setRenameValue(folder.name);
  };

  const cancelRename = () => {
    skipRenameBlur.current = true;
    setRenamingId(null);
    setRenameValue("");
  };

  const commitRename = (folder: MediaFolder) => {
    if (skipRenameBlur.current) {
      skipRenameBlur.current = false;
      return;
    }
    const name = renameValue.trim();
    if (!name || name === folder.name) {
      setRenamingId(null);
      setRenameValue("");
      return;
    }
    renameFolder.mutate({ id: folder.id, name });
  };

  const toggleOne = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = async () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelectingAll(true);
    try {
      const ids: string[] = [];
      for (let next = 0; ; next++) {
        const chunk = await mediaApi.list({ folderId, q: search, kind, page: next, size: ALL_CHUNK });
        ids.push(...chunk.items.map((item) => item.id));
        if (chunk.items.length < ALL_CHUNK || ids.length >= chunk.total) break;
      }
      setSelected(new Set(ids));
    } catch (error) {
      notify.error(errorMessage(error, "Не удалось выбрать все файлы"));
    } finally {
      setSelectingAll(false);
    }
  };

  const submitCreate = () => {
    const name = createName.trim();
    if (!name) return;
    createFolder.mutate(name);
  };

  const runBulkMove = (targetValue: string) => {
    if (!targetValue || selectedCount === 0) return;
    const target = targetValue === MOVE_ROOT ? null : targetValue;
    bulkMove.mutate({ ids: Array.from(selected), target });
  };

  const headerSlot = useContext(HeaderSlotContext);
  const filtersActive = Boolean(kind);
  const currentTitle = searching ? "Результаты поиска" : folderId ? data?.folderName ?? "" : "Все материалы";

  const searchField = (
    <TextInput
      aria-label="Поиск по имени"
      placeholder="Поиск по всем папкам"
      value={q}
      w="var(--grid-col-span-3-width)"
      leftSection={<Icon name="search" />}
      leftSectionPointerEvents="none"
      onChange={(event) => {
        setQ(event.currentTarget.value);
        setPage(0);
      }}
    />
  );

  const renderFolder = (folder: MediaFolder): ReactNode => {
    const nested = children.get(folder.id) ?? [];
    const open = expanded.has(folder.id);
    const active = !searching && folderId === folder.id;
    const icon = <Icon name="folder" size={18} />;
    if (renamingId === folder.id) {
      return (
        <NavLink
          key={folder.id}
          component="div"
          active={active}
          leftSection={icon}
          className="media-folder media-folder-rename"
          label={
            <input
              ref={renameInput}
              value={renameValue}
              disabled={renameFolder.isPending}
              aria-label={`Название папки «${folder.name}»`}
              onChange={(event) => setRenameValue(event.currentTarget.value)}
              onBlur={() => commitRename(folder)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelRename();
                }
              }}
            />
          }
        />
      );
    }
    return (
      <NavLink
        key={folder.id}
        component="div"
        role="treeitem"
        tabIndex={0}
        aria-current={active ? "true" : undefined}
        aria-expanded={nested.length ? open : undefined}
        active={active}
        opened={open}
        className="media-folder"
        childrenOffset="sm"
        noWrap
        title={`${folder.name} – двойной клик, чтобы переименовать`}
        leftSection={icon}
        label={folder.name}
        disableRightSectionRotation
        onClick={() => openFolder(folder.id)}
        onDoubleClick={(event) => {
          event.preventDefault();
          beginRename(folder);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter") openFolder(folder.id);
        }}
        rightSection={
          <Group gap={4} wrap="nowrap">
            <IconButton
              className="media-folder-delete"
              color="red"
              size="sm"
              variant="transparent"
              label="Удалить папку"
              aria-label={`Удалить папку «${folder.name}»`}
              onClick={(event) => {
                event.stopPropagation();
                setRemoving({ kind: "folder", id: folder.id, name: folder.name });
              }}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <Icon name="trash" />
            </IconButton>
            {nested.length ? (
              <ActionIcon
                variant="transparent"
                color="gray"
                size="sm"
                aria-label={open ? `Свернуть «${folder.name}»` : `Развернуть «${folder.name}»`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpanded(folder.id);
                }}
                onDoubleClick={(event) => event.stopPropagation()}
              >
                <Icon name={open ? "down" : "chevron"} size={14} />
              </ActionIcon>
            ) : null}
          </Group>
        }
      >
        {nested.length ? nested.map(renderFolder) : undefined}
      </NavLink>
    );
  };

  return (
    <Stack gap="sm">
      {headerSlot ? createPortal(searchField, headerSlot) : null}
      <PageHeader
        title="Материалы"
        actions={
          <>
            <Popover width={280} position="bottom-end" shadow="md">
              <Popover.Target>
                <Button
                  variant={filtersActive ? "light" : "subtle"}
                  color={filtersActive ? "iba" : "gray"}
                  leftSection={<Icon name="filter" />}
                >
                  Фильтр
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="sm">
                  <Select
                    size="sm"
                    label="Тип"
                    value={kind}
                    withinPortal={false}
                    onChange={(next) => {
                      setKind(next as MediaKind | "");
                      setPage(0);
                    }}
                    options={[
                      { value: "", label: "Все типы" },
                      { value: "audio", label: "Аудио" },
                      { value: "image", label: "Изображения" },
                      { value: "video", label: "Видео" },
                    ]}
                  />
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    disabled={!filtersActive}
                    style={{ alignSelf: "flex-end" }}
                    onClick={() => {
                      setKind("");
                      setPage(0);
                    }}
                  >
                    Сбросить фильтр
                  </Button>
                </Stack>
              </Popover.Dropdown>
            </Popover>
            <Tooltip label="MP3, M4A, WAV, OGG, WEBM, PNG, JPG, WEBP, GIF" position="bottom">
              <Button
                leftSection={<Icon name="upload" />}
                loading={upload.isPending}
                disabled={searching}
                onClick={() => input.current?.click()}
              >
                {upload.isPending ? "Загрузка…" : "Загрузить"}
              </Button>
            </Tooltip>
          </>
        }
      />
      <input
        ref={input}
        className="sr-only"
        type="file"
        multiple
        accept="audio/*,image/*,video/mp4,video/webm"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) upload.mutate(files);
        }}
      />

      <Grid columns={10} gap="var(--grid-gutter)" align="flex-start">
        <Grid.Col span={{ base: 10, md: 2 }}>
          <SettingsCard>
            <Stack gap="sm">
              <Group justify="space-between" gap="md" wrap="nowrap">
                <SettingsSectionTitle>Папки</SettingsSectionTitle>
                <Tooltip label={folderId && !searching ? `Новая папка в «${data?.folderName ?? ""}»` : "Новая папка"}>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="lg"
                    aria-label="Новая папка"
                    disabled={busy || searching}
                    onClick={() => {
                      setCreateName("");
                      setCreating(true);
                    }}
                  >
                    <Icon name="plus" size={20} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Stack gap={4} role="tree" aria-label="Папки" className="media-folder-tree">
                <NavLink
                  component="button"
                  type="button"
                  active={!folderId && !searching}
                  aria-current={!folderId && !searching ? "true" : undefined}
                  leftSection={<Icon name="home" size={18} />}
                  label="Все материалы"
                  onClick={() => openFolder(null)}
                />
                {(children.get(ROOT_KEY) ?? []).map(renderFolder)}
              </Stack>
            </Stack>
          </SettingsCard>
        </Grid.Col>

        <Grid.Col span={{ base: 10, md: 8 }}>
          <Stack gap="sm">
            <SettingsCard
              className="media-dropzone"
              data-dragging={dragging || undefined}
              onDragEnter={(event) => {
                if (!event.dataTransfer.types.includes("Files")) return;
                event.preventDefault();
                dragDepth.current += 1;
                setDragging(true);
              }}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes("Files")) event.preventDefault();
              }}
              onDragLeave={() => {
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (dragDepth.current === 0) setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                dragDepth.current = 0;
                setDragging(false);
                const files = Array.from(event.dataTransfer.files).filter((file) => /^(audio|image|video)\//.test(file.type));
                if (files.length && !busy) upload.mutate(files);
              }}
            >
              <Stack gap="sm">
                <Group justify="space-between" gap="md" wrap="nowrap" mih={42}>
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <SettingsSectionTitle>{currentTitle}</SettingsSectionTitle>
                    {data ? <Text size="sm" c="dimmed">{data.total}</Text> : null}
                  </Group>
                  <Group gap="md" wrap="nowrap">
                    {selectedCount > 0 ? (
                      <>
                        <Menu position="bottom-end" shadow="md" width={280}>
                          <Menu.Target>
                            <Button
                              variant="subtle"
                              color="gray"
                              leftSection={<Icon name="folder" />}
                              disabled={busy || moveOptions.length === 0}
                            >
                              Переместить
                            </Button>
                          </Menu.Target>
                          <Menu.Dropdown mah={320} style={{ overflowY: "auto" }}>
                            {moveOptions.map((option) => (
                              <Menu.Item key={option.value} onClick={() => runBulkMove(option.value)}>
                                {option.label}
                              </Menu.Item>
                            ))}
                          </Menu.Dropdown>
                        </Menu>
                        <Button
                          variant="subtle"
                          color="red"
                          leftSection={<Icon name="trash" />}
                          disabled={busy}
                          onClick={() => setRemoving({ kind: "files", ids: Array.from(selected) })}
                        >
                          Удалить
                        </Button>
                      </>
                    ) : null}
                    {items.length > 0 ? (
                      <Checkbox
                        label="Выбрать все"
                        checked={allSelected}
                        indeterminate={selectedCount > 0 && !allSelected}
                        disabled={selectingAll}
                        onChange={() => void toggleAll()}
                      />
                    ) : null}
                  </Group>
                </Group>

                {list.isLoading && <Loading />}
                {list.isError && (
                  <Alert color="red" variant="light" role="alert">{errorMessage(list.error, "Не удалось загрузить материалы")}</Alert>
                )}
                {data && items.length === 0 && (
                  <Stack gap={4} align="center" py="xl">
                    <Text fw={600}>{search || kind ? "Ничего не найдено" : "Файлов нет"}</Text>
                    <SettingsHint>
                      {search || kind ? "Измените запрос или тип файла" : "Загрузите аудио или изображения в эту папку"}
                    </SettingsHint>
                  </Stack>
                )}

                {items.length > 0 && (
                  <Stack gap={0} component="ul" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {items.map((asset) => {
                      const type = mediaKindOf(asset.mimeType);
                      const checked = selected.has(asset.id);
                      return (
                        <Box component="li" key={asset.id} className="media-file-row" data-checked={checked || undefined}>
                          <Checkbox checked={checked} aria-label={`Выбрать «${asset.filename}»`} onChange={() => toggleOne(asset.id)} />
                          <Box w={40} h={40} style={{ flex: "none", display: "grid", placeItems: "center" }}>
                            {type === "image" ? (
                              <UnstyledButton
                                aria-label={`Открыть «${asset.filename}»`}
                                style={{ display: "flex", borderRadius: "var(--mantine-radius-sm)" }}
                                onClick={() => setPreview({ src: teacherMediaUrl(asset.id), name: asset.filename })}
                              >
                                <Image src={teacherMediaUrl(asset.id)} alt="" w={40} h={40} radius="sm" fit="cover" />
                              </UnstyledButton>
                            ) : type === "audio" ? (
                              <MediaAudioPlayer compact src={teacherMediaUrl(asset.id)} label={asset.filename} />
                            ) : (
                              <Box c="iba"><Icon name="file" size={20} /></Box>
                            )}
                          </Box>
                          <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                            <Text fw={600} truncate title={asset.filename}>{asset.filename}</Text>
                            <Text size="sm" c="dimmed">
                              {kindLabel(type)} · {formatBytes(asset.sizeBytes)} · {formatDate(asset.createdAt)}
                            </Text>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </SettingsCard>
            {data && items.length > 0 && <Pagination page={page} size={SIZE} total={data.total} onChange={setPage} />}
          </Stack>
        </Grid.Col>
      </Grid>

      <Modal opened={preview !== null} onClose={() => setPreview(null)} title={preview?.name} size="xl">
        {preview ? <Image src={preview.src} alt={preview.name} radius="sm" fit="contain" mah="70vh" /> : null}
      </Modal>

      <Modal
        opened={creating}
        title={folderId && !searching ? `Новая папка в «${data?.folderName ?? ""}»` : "Новая папка"}
        onClose={() => {
          setCreating(false);
          setCreateName("");
          createFolder.reset();
        }}
      >
        <Stack gap="md">
          <TextInput
            label="Название"
            value={createName}
            data-autofocus
            onChange={(event) => setCreateName(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitCreate();
              }
            }}
          />
          {createFolder.isError && (
            <Alert color="red" variant="light" role="alert">{errorMessage(createFolder.error, "Не удалось сохранить")}</Alert>
          )}
          <Group justify="flex-end" gap="md">
            <Button
              variant="default"
              onClick={() => {
                setCreating(false);
                setCreateName("");
                createFolder.reset();
              }}
            >
              Отмена
            </Button>
            <Button disabled={!createName.trim() || busy} loading={createFolder.isPending} onClick={submitCreate}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>

      {removing?.kind === "folder" && (
        <ConfirmDialog
          open
          title="Удалить папку?"
          confirmLabel="Удалить"
          danger
          busy={removeFolder.isPending}
          error={removeFolder.isError ? errorMessage(removeFolder.error, "Не удалось удалить") : undefined}
          onConfirm={() => removeFolder.mutate(removing.id)}
          onClose={() => {
            setRemoving(null);
            removeFolder.reset();
          }}
        >
          Папка «{removing.name}» будет удалена. Файлы и вложенные папки переместятся на уровень выше
        </ConfirmDialog>
      )}

      {removing?.kind === "files" && (
        <ConfirmDialog
          open
          title={removing.ids.length === 1 ? "Удалить файл?" : `Удалить файлы (${removing.ids.length})?`}
          confirmLabel="Удалить"
          danger
          busy={bulkDelete.isPending}
          error={bulkDelete.isError ? errorMessage(bulkDelete.error, "Не удалось удалить") : undefined}
          onConfirm={() => bulkDelete.mutate(removing.ids)}
          onClose={() => {
            setRemoving(null);
            bulkDelete.reset();
          }}
        >
          {removing.ids.length === 1
            ? "Файл пропадёт из материалов. В тестах, где он уже используется, он останется"
            : "Файлы пропадут из материалов. В тестах, где они уже используются, они останутся"}
        </ConfirmDialog>
      )}
    </Stack>
  );
}
