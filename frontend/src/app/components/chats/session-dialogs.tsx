import type { FormEvent } from 'react';
import type { Session } from '@/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface ChatSessionDialogsProps {
  sessionToDelete: Session | null;
  sessionToRename: Session | null;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onCloseRenameDialog: () => void;
  onConfirmDelete: () => void;
  onDismissDelete: () => void;
  onSubmitRename: (event: FormEvent<HTMLFormElement>) => void;
}

export function ChatSessionDialogs({
  sessionToDelete,
  sessionToRename,
  renameValue,
  onRenameValueChange,
  onCloseRenameDialog,
  onConfirmDelete,
  onDismissDelete,
  onSubmitRename,
}: ChatSessionDialogsProps) {
  return (
    <>
      <AlertDialog open={sessionToDelete !== null} onOpenChange={(open) => !open && onDismissDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Current Chat</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the current chat and all messages, and cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={sessionToRename !== null}
        onOpenChange={(open) => {
          if (!open) {
            onCloseRenameDialog();
          }
        }}
      >
        <DialogContent>
          <form onSubmit={onSubmitRename} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Rename Chat</DialogTitle>
              <DialogDescription>Give the chat a more recognizable name.</DialogDescription>
            </DialogHeader>
            <Input
              value={renameValue}
              onChange={(event) => onRenameValueChange(event.target.value)}
              placeholder="Enter new chat name"
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCloseRenameDialog}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
