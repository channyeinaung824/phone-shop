'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DeleteConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    isDeleting?: boolean;
}

export function DeleteConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
    title = 'Are you sure?',
    description = 'This action cannot be undone.',
    isDeleting = false,
}: DeleteConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-visible border-none shadow-none bg-transparent">
                <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                    {/* Floating Dark Header */}
                    <div className="relative mx-4 -mt-6 mb-4 grid h-24 place-items-center overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border text-white shadow-lg shadow-gray-900/20">
                        <DialogTitle className="block font-sans text-xl font-semibold leading-snug tracking-normal text-white antialiased">
                            {title}
                        </DialogTitle>
                    </div>

                    <div className="p-6 pt-0">
                        <DialogDescription className="block font-sans text-sm font-normal leading-relaxed text-gray-500 antialiased dark:text-gray-400 text-center mb-6">
                            {description}
                        </DialogDescription>

                        <div className="flex justify-center gap-4">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isDeleting}
                                className="border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/10"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive" // destructive causes red background
                                onClick={onConfirm}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700 text-white shadow-md transition-all hover:shadow-lg"
                            >
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
