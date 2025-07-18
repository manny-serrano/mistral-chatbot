"use client"

import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Archive, Trash2, RotateCcw } from 'lucide-react'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'warning' | 'default'
  icon?: 'delete' | 'archive' | 'restore' | 'warning'
  isLoading?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon = 'warning',
  isLoading = false
}: ConfirmationDialogProps) {
  const getIcon = () => {
    switch (icon) {
      case 'delete':
        return <Trash2 className="h-6 w-6 text-red-500" />
      case 'archive':
        return <Archive className="h-6 w-6 text-orange-500" />
      case 'restore':
        return <RotateCcw className="h-6 w-6 text-blue-500" />
      default:
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />
    }
  }

  const getButtonClass = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-600 hover:bg-red-700 text-white'
      case 'warning':
        return 'bg-orange-600 hover:bg-orange-700 text-white'
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle className="text-lg font-semibold">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-gray-600 mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={getButtonClass()}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Pre-configured confirmation dialogs for common use cases
export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  isLoading = false
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  itemName: string
  isLoading?: boolean
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Report"
      description={`Are you sure you want to permanently delete "${itemName}"? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="destructive"
      icon="delete"
      isLoading={isLoading}
    />
  )
}

export function ArchiveConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  isLoading = false
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  itemName: string
  isLoading?: boolean
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Archive Report"
      description={`Are you sure you want to archive "${itemName}"? Archived reports can be restored later.`}
      confirmText="Archive"
      cancelText="Cancel"
      variant="warning"
      icon="archive"
      isLoading={isLoading}
    />
  )
}

export function RestoreConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  isLoading = false
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  itemName: string
  isLoading?: boolean
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Restore Report"
      description={`Are you sure you want to restore "${itemName}" from the archive?`}
      confirmText="Restore"
      cancelText="Cancel"
      variant="default"
      icon="restore"
      isLoading={isLoading}
    />
  )
} 