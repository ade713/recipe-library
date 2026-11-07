import { useCallback, useState } from "react";

import { ApiError } from "@/api/errors";
import type { TagResponse } from "@/types/tag";

import { saveTag } from "./tag-service";

const MAX_TAG_LENGTH = 50;
const TAG_CREATE_ERROR_MESSAGE = "Unable to create tag. Please try again.";
const TAG_DUPLICATE_ERROR_MESSAGE = "A tag with this name already exists.";
const TAG_NAME_LENGTH_ERROR_MESSAGE = "Tag names must be 50 characters or fewer.";

type TagCreationOptions = {
  tags: TagResponse[];
  searchTerm: string;
  disabled?: boolean;
  onCreated: (tag: TagResponse) => void;
};

type TagCreation = {
  newTagName: string;
  canCreateTag: boolean;
  nameError: string | null;
  isCreatingTag: boolean;
  tagCreateError: string | null;
  createTag: () => Promise<void>;
  clearTagCreateError: () => void;
};

export function useTagCreation({ tags, searchTerm, disabled, onCreated }: TagCreationOptions): TagCreation {
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [tagCreateError, setTagCreateError] = useState<string | null>(null);

  const newTagName = searchTerm.trim();
  const nameError = Array.from(newTagName).length > MAX_TAG_LENGTH ? TAG_NAME_LENGTH_ERROR_MESSAGE : null;
  const canCreateTag =
    newTagName.length > 0 &&
    nameError === null &&
    tags.every((tag) => tag.name.toLowerCase() !== newTagName.toLowerCase());

  const createTag = async (): Promise<void> => {
    if (!canCreateTag || isCreatingTag || disabled) {
      return;
    }

    setIsCreatingTag(true);
    setTagCreateError(null);

    try {
      const response = await saveTag(newTagName);
      onCreated(response);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setTagCreateError(TAG_DUPLICATE_ERROR_MESSAGE);
      } else {
        setTagCreateError(TAG_CREATE_ERROR_MESSAGE);
      }
    } finally {
      setIsCreatingTag(false);
    }
  };

  const clearTagCreateError = useCallback(() => {
    setTagCreateError(null);
  }, []);

  return {
    newTagName,
    canCreateTag,
    nameError,
    isCreatingTag,
    tagCreateError,
    createTag,
    clearTagCreateError,
  };
}
