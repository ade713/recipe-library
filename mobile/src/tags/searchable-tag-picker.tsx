import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { TagResponse } from "@/types/tag";

const MAX_TAG_SUGGESTIONS = 5;
const TAGS_EMPTY_MESSAGE = "No tags yet.";
const TAGS_SEARCH_EMPTY_MESSAGE = "No matching tags.";
const TAGS_SEARCH_LABEL = "Search tags";
const TAGS_SEARCH_PLACEHOLDER = "Search Tags";

export type SearchableTagPickerProps = {
  tags: TagResponse[];
  selectedTagIds: string[];
  searchTerm: string;
  searchDisabled?: boolean;
  onSearchChange: (value: string) => void;
  onSelectTag: (id: string) => void;
  onRemoveTag: (id: string) => void;
};

export function SearchableTagPicker({
  tags,
  selectedTagIds,
  searchTerm,
  searchDisabled,
  onSearchChange,
  onSelectTag,
  onRemoveTag,
}: SearchableTagPickerProps) {
  const renderSelectedTags = () => {
    return (
      <View style={styles.tagRow}>
        {selectedTagIds.map((tagId) => {
          const tag = tags.find((tag) => tag.id === tagId);
          if (tag === undefined) {
            return null;
          }

          return (
            <Pressable
              key={tagId}
              accessibilityRole='button'
              accessibilityLabel={`Remove tag ${tag.name}`}
              onPress={() => onRemoveTag(tagId)}
              style={[styles.tagButton, styles.selectedTag]}
            >
              <Text>{`${tag.name} x`}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderMatchingTags = () => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    if (normalizedSearchTerm.length === 0) {
      return null;
    }

    const matchingTags = tags
      .filter((tag) => tag.name.toLowerCase().includes(normalizedSearchTerm) && !selectedTagIds.includes(tag.id))
      .slice(0, MAX_TAG_SUGGESTIONS);

    if (matchingTags.length === 0) {
      return <Text>{TAGS_SEARCH_EMPTY_MESSAGE}</Text>;
    }

    return (
      <View style={styles.tagRow}>
        {matchingTags.map((tag) => (
          <Pressable
            key={tag.id}
            accessibilityRole='button'
            accessibilityLabel={`Select tag ${tag.name}`}
            onPress={() => onSelectTag(tag.id)}
            style={styles.tagButton}
          >
            <Text style={styles.matchingTag}>{tag.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <>
      {selectedTagIds.length > 0 && renderSelectedTags()}
      <TextInput
        accessibilityLabel={TAGS_SEARCH_LABEL}
        placeholder={TAGS_SEARCH_PLACEHOLDER}
        autoCorrect={false}
        autoCapitalize='none'
        editable={!searchDisabled}
        value={searchTerm}
        onChangeText={onSearchChange}
        style={[styles.formInput, searchDisabled && styles.disabledInput]}
      />

      {tags.length === 0 && <Text>{TAGS_EMPTY_MESSAGE}</Text>}
      {renderMatchingTags()}
    </>
  );
}

const styles = StyleSheet.create({
  formInput: {
    minWidth: 0,
    borderRadius: 2,
    borderColor: "#2196F3",
    borderWidth: 1,
    borderStyle: "solid",
    marginTop: 2,
    marginBottom: 2,
  },
  disabledInput: {
    backgroundColor: "#F0F0F0",
    borderColor: "#BDBDBD",
    color: "#757575",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
    borderWidth: 1,
    borderRadius: 15,
  },
  selectedTag: {
    backgroundColor: "#E3F2FD",
    borderRadius: 20,
  },
  matchingTag: {
    color: "#FFF",
  },
});
