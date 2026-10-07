"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
export function AppDialog({
  open,
  onClose,
  title,
  titleAction,
  description = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleAction?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] max-w-[680px] sm:max-w-[680px] p-5">
        <DialogHeader>
          <div className="flex items-center gap-2 pr-8">
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
            {titleAction}
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
