'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';
import { UserDialog } from '@/components/user-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import api from '@/lib/axios';

const PAGE_SIZE_OPTIONS = [10, 50, 100];

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchUsers = async (currentPage = page, currentLimit = limit) => {
        setIsLoading(true);
        try {
            const { data } = await api.get(`/users?page=${currentPage}&limit=${currentLimit}`);
            setUsers(data.data);
            setTotal(data.total);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchUsers(page);
    }, [page]);

    const handleLimitChange = (newLimit: string) => {
        const l = Number(newLimit);
        setLimit(l);
        setPage(1);
        fetchUsers(1, l);
    };

    const handleCreate = () => {
        setSelectedUser(null);
        setDialogOpen(true);
    };

    const handleEdit = (user: any) => {
        setSelectedUser(user);
        setDialogOpen(true);
    };

    const handleDelete = (user: any) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        try {
            await api.delete(`/users/${userToDelete.id}`);
            fetchUsers();
            setDeleteDialogOpen(false);
            setUserToDelete(null);
            toast.success('User deleted successfully');
        } catch (error: any) {
            console.error('Failed to delete user', error);
            const message = error.response?.data?.message || 'Failed to delete user';
            toast.error(message);
            setDeleteDialogOpen(false);
        }
    };

    return (
        <div className="mt-6 mb-4 flex flex-col gap-6">
            <div className="relative flex flex-col bg-white bg-clip-border rounded-xl shadow-md dark:bg-[#202940]">
                {/* Floating Dark Header */}
                <div className="relative mx-4 -mt-6 overflow-hidden rounded-xl bg-gradient-to-tr from-gray-900 to-gray-800 bg-clip-border p-6 text-white shadow-lg shadow-gray-900/20 flex items-center justify-between">
                    <div>
                        <h6 className="block text-xl font-bold leading-relaxed tracking-normal text-white antialiased">
                            Users List
                        </h6>
                        <p className="font-sans text-sm font-normal leading-normal text-gray-200 antialiased opacity-80">
                            See information about all users
                        </p>
                    </div>
                    <Button
                        onClick={handleCreate}
                        className="bg-white text-gray-900 hover:bg-gray-100 font-bold"
                        size="sm"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                </div>

                <div className="px-0 overflow-x-auto">
                    <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-white dark:bg-[#202940]">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead className="text-xs font-bold uppercase text-gray-400 dark:text-gray-300 px-4 py-2">User</TableHead>
                                    <TableHead className="text-xs font-bold uppercase text-gray-400 dark:text-gray-300 px-4 py-2">Role</TableHead>
                                    <TableHead className="text-xs font-bold uppercase text-gray-400 dark:text-gray-300 px-4 py-2">Status</TableHead>
                                    <TableHead className="text-xs font-bold uppercase text-gray-400 dark:text-gray-300 px-4 py-2">Joined</TableHead>
                                    <TableHead className="text-xs font-bold uppercase text-gray-400 dark:text-gray-300 px-4 py-2"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} className="border-b border-gray-100 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5">
                                        <TableCell className="px-4 py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white text-xs font-medium dark:bg-white dark:text-gray-900">
                                                    {user.name?.[0] || 'U'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="block font-sans text-sm font-semibold leading-normal text-gray-900 antialiased dark:text-white">
                                                        {user.name}
                                                    </p>
                                                    <p className="block font-sans text-xs font-normal leading-normal text-gray-500 antialiased dark:text-gray-400">
                                                        {user.phone}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-2">
                                            <p className="block font-sans text-xs font-semibold leading-normal text-gray-500 antialiased dark:text-gray-400">
                                                {user.role}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-4 py-2">
                                            <Badge
                                                variant="outline"
                                                className={user.status === 'ACTIVE'
                                                    ? "bg-gradient-to-tr from-green-600 to-green-400 text-white border-none"
                                                    : "bg-gradient-to-tr from-gray-600 to-gray-400 text-white border-none"
                                                }
                                            >
                                                {user.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-2">
                                            <p className="block font-sans text-xs font-semibold leading-normal text-gray-500 antialiased dark:text-gray-400">
                                                {format(new Date(user.createdAt), 'dd/MM/yy')}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                    onClick={() => handleEdit(user)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                    onClick={() => handleDelete(user)}
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 0 && (
                        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Rows per page</span>
                                    <Select value={String(limit)} onValueChange={handleLimitChange}>
                                        <SelectTrigger className="h-7 w-[65px] text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAGE_SIZE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt} value={String(opt)} className="text-xs">
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Showing{' '}
                                    <span className="font-medium text-gray-700 dark:text-gray-200">
                                        {total === 0 ? 0 : (page - 1) * limit + 1}
                                    </span>
                                    –
                                    <span className="font-medium text-gray-700 dark:text-gray-200">
                                        {Math.min(page * limit, total)}
                                    </span>
                                    {' '}of{' '}
                                    <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => {
                                        if (totalPages <= 7) return true;
                                        if (p === 1 || p === totalPages) return true;
                                        if (Math.abs(p - page) <= 1) return true;
                                        return false;
                                    })
                                    .reduce<(number | string)[]>((acc, p, idx, arr) => {
                                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                                            acc.push('...' + p);
                                        }
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((item) => {
                                        if (typeof item === 'string') {
                                            return (
                                                <span key={item} className="px-1 text-sm text-gray-400 select-none">
                                                    …
                                                </span>
                                            );
                                        }
                                        return (
                                            <Button
                                                key={item}
                                                variant={item === page ? 'default' : 'outline'}
                                                size="icon"
                                                className={`h-8 w-8 text-xs ${item === page
                                                        ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200'
                                                        : ''
                                                    }`}
                                                onClick={() => setPage(item)}
                                            >
                                                {item}
                                            </Button>
                                        );
                                    })}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <UserDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                user={selectedUser}
                onSuccess={fetchUsers}
            />

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title="Delete User"
                description={`Are you sure you want to delete ${userToDelete?.name}? This action cannot be undone.`}
            />
        </div>
    );
}
