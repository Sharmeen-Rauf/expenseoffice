'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, UserCheck, ShieldAlert, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserProfile {
  id: string;
  email: string;
  role: 'boss' | 'manager' | 'pending';
  full_name: string | null;
  updated_at: string;
}

export default function UsersPage() {
  const { role, user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true });

      if (error) throw error;
      setProfiles((data as UserProfile[]) || []);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to load user profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'boss') {
      Promise.resolve().then(() => {
        loadProfiles();
      });
    }
  }, [role]);

  const handleUpdateRole = async (userId: string, newRole: 'boss' | 'manager' | 'pending') => {
    if (userId === currentUser?.id) {
      toast.error('You cannot change your own role to prevent lockout.');
      return;
    }

    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User role successfully changed to ${newRole}`);
      loadProfiles();
    } catch (err: unknown) {
      console.error(err);
      const error = err as Error;
      toast.error(error.message || 'Failed to update user role.');
    } finally {
      setUpdatingId(null);
    }
  };

  // RBAC Access Guard
  if (role !== 'boss') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-full border border-rose-100 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Access Denied</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-2 leading-relaxed">
          Only administrators with the **Boss** role are authorized to manage user accounts and system permissions.
        </p>
      </div>
    );
  }

  if (loading && profiles.length === 0) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">User Access Management</h2>
        <p className="text-sm text-slate-500">Approve pending registration requests and modify member access levels.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow>
              <TableHead className="text-slate-700 font-bold">User</TableHead>
              <TableHead className="text-slate-700 font-bold">Email Address</TableHead>
              <TableHead className="text-slate-700 font-bold">Role Status</TableHead>
              <TableHead className="text-slate-700 font-bold text-right">Access Controls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => {
              const isSelf = profile.id === currentUser?.id;
              const isPending = profile.role === 'pending';

              return (
                <TableRow key={profile.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                  <TableCell className="py-3 px-4 font-semibold text-slate-900">
                    {profile.full_name || 'N/A'} {isSelf && <span className="text-xs text-slate-400 font-normal ml-1.5">(You)</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-slate-600 font-medium">
                    {profile.email}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <Badge
                      className={`font-semibold capitalize border ${
                        profile.role === 'boss'
                          ? 'bg-slate-900 text-white border-slate-950 hover:bg-slate-900'
                          : profile.role === 'manager'
                          ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      {profile.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4 text-right">
                    {isSelf ? (
                      <span className="text-xs text-slate-400 font-medium">Locked</span>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        {isPending ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateRole(profile.id, 'manager')}
                              disabled={updatingId !== null}
                              className="text-xs h-8 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                            >
                              <UserCheck className="mr-1 h-3.5 w-3.5" />
                              Approve Manager
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateRole(profile.id, 'boss')}
                              disabled={updatingId !== null}
                              className="text-xs h-8 bg-slate-900 text-white hover:bg-slate-800"
                            >
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                              Approve Boss
                            </Button>
                          </>
                        ) : (
                          <>
                            {profile.role === 'boss' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateRole(profile.id, 'manager')}
                                disabled={updatingId !== null}
                                className="text-xs h-8 border-slate-200 hover:bg-slate-50 text-slate-700"
                              >
                                <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
                                Demote to Manager
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateRole(profile.id, 'boss')}
                                disabled={updatingId !== null}
                                className="text-xs h-8 border-slate-200 hover:bg-slate-900 hover:text-white"
                              >
                                <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
                                Promote to Boss
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateRole(profile.id, 'pending')}
                              disabled={updatingId !== null}
                              className="text-xs h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            >
                              Revoke Access
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
