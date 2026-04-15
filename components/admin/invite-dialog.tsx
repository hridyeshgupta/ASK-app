'use client';

// components/admin/invite-dialog.tsx
//  "admins can only invite members to their own vertical,
//       and only super admin can assign or remove other admins"

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth/auth-context';
import { isSuperAdmin } from '@/lib/auth/rbac';
import type { Module, UserRole } from '@/lib/types/auth';
import { UserPlusIcon, Loader2Icon } from 'lucide-react';

interface InviteDialogProps {
  module: Module;
}

export function InviteDialog({ module }: InviteDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAssignAdmin = user ? isSuperAdmin(user.role) : false;

  const handleInvite = async () => {
    setIsSubmitting(true);
    // TODO: Call auth-service inviteUser
    setTimeout(() => {
      setIsSubmitting(false);
      setOpen(false);
      setEmail('');
      setRole('member');
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" id="invite-member">
          <UserPlusIcon className="h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New Member</DialogTitle>
          <DialogDescription>
            Invite a member to the {module === 'ra' ? 'Research Analyst' : 'Private Credit'} module.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                {canAssignAdmin && (
                  <>
                    <SelectItem value={`${module}_admin`}>
                      {module === 'ra' ? 'RA' : 'PC'} Admin
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {!canAssignAdmin && (
              <p className="text-xs text-muted-foreground">
                Only super admins can assign admin roles.
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleInvite}
            disabled={!email || isSubmitting}
            id="send-invite"
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Invite'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
