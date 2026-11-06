import { useEffect, useState } from "react";

import type { TagResponse } from "@/types/tag";

import { loadTags } from "./tag-service";

const TAGS_LOADING_ERROR_MESSAGE = "Unable to load tags.";

type AvailableTags = {
  tags: TagResponse[];
  isLoadingTags: boolean;
  tagError: string | null;
  retryLoadingTags: () => void;
  addTag: (tag: TagResponse) => void;
};

export function useAvailableTags(reloadKey?: string): AvailableTags {
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagLoadingAttempt, setTagLoadingAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    setIsLoadingTags(true);
    setTagError(null);
    setTags([]);

    const getTags = async (): Promise<void> => {
      try {
        const response = await loadTags();
        if (active) {
          setTags(response.items);
        }
      } catch {
        if (active) {
          setTagError(TAGS_LOADING_ERROR_MESSAGE);
        }
      } finally {
        if (active) {
          setIsLoadingTags(false);
        }
      }
    };

    void getTags();

    return () => {
      active = false;
    };
  }, [tagLoadingAttempt, reloadKey]);

  const retryLoadingTags = () => {
    if (isLoadingTags) {
      return;
    }

    setIsLoadingTags(true);
    setTagError(null);

    setTagLoadingAttempt((attempt) => attempt + 1);
  };

  const addTag = (tag: TagResponse) => {
    setTags((currentTags) => [...currentTags, tag]);
  };

  return {
    tags,
    isLoadingTags,
    tagError,
    retryLoadingTags,
    addTag,
  };
}
