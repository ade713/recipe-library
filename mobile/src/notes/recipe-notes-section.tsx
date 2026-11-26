import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import type { NoteResponse } from "@/types/note";

import { loadNotes } from "./note-service";

const EMPTY_NOTES_MESSAGE = "No personal notes yet.";
const HEADING = "Personal notes";
const LOADING_NOTES_MESSAGE = "Loading notes...";
const LOAD_NOTES_ERROR_MESSAGE = "Unable to load notes.";
const RETRY_NOTES_LABEL = "Retry notes";

type RecipeNotesSectionProps = {
  recipeId: string;
  isFocused?: boolean;
};

export function RecipeNotesSection({ recipeId, isFocused = true }: RecipeNotesSectionProps) {
  const [notes, setNotes] = useState<NoteResponse[] | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [loadingAttempt, setLoadingAttempt] = useState(0);
  const [notesErrorMessage, setNotesErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let active = true;

    setIsLoadingNotes(true);
    setNotesErrorMessage(null);
    setNotes(null);

    const getNotes = async (): Promise<void> => {
      try {
        const response = await loadNotes(recipeId);

        if (active) {
          setNotes(response);
        }
      } catch {
        if (active) {
          setNotesErrorMessage(LOAD_NOTES_ERROR_MESSAGE);
        }
      } finally {
        if (active) {
          setIsLoadingNotes(false);
        }
      }
    };
    void getNotes();

    return () => {
      active = false;
    };
  }, [recipeId, loadingAttempt, isFocused]);

  const retryLoadingNotes = () => {
    if (isLoadingNotes) {
      return;
    }

    setIsLoadingNotes(true);
    setNotesErrorMessage(null);

    setLoadingAttempt((attempt) => attempt + 1);
  };

  const renderNotes = () => {
    if (isLoadingNotes) {
      return <Text>{LOADING_NOTES_MESSAGE}</Text>;
    }

    if (notesErrorMessage !== null) {
      return (
        <>
          <Text style={styles.errorMessage}>{notesErrorMessage}</Text>
          <Button accessibilityLabel={RETRY_NOTES_LABEL} title={RETRY_NOTES_LABEL} onPress={retryLoadingNotes} />
        </>
      );
    }

    if (notes === null) {
      return null;
    }

    return (
      <>
        {notes.length === 0 && <Text>{EMPTY_NOTES_MESSAGE}</Text>}
        {notes.map((note) => (
          <Text key={note.id}>{note.note}</Text>
        ))}
      </>
    );
  };

  return (
    <View>
      <Text accessibilityRole='header'>{HEADING}</Text>
      {renderNotes()}
    </View>
  );
}

const styles = StyleSheet.create({
  errorMessage: {
    color: "#f32121",
  },
});
