import { useQuery } from "@tanstack/react-query";
import { Shield, Mail, User } from "lucide-react";
import { adminsApi } from "../api/admins";
import { ROLE_LABELS } from "../types/auth";
import type { AdminRole } from "../types/auth";

export function AdminsPage() {
  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: () => adminsApi.list(),
  });

  const safeAdmins = Array.isArray(admins) ? admins : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Admins & Roles
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Manage admin accounts and permissions (Super Admin only)
        </p>
      </div>
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : safeAdmins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Shield className="h-12 w-12 text-neutral-600" />
            <p className="mt-4 text-sm">No admins found</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {safeAdmins.map((admin) => (
              <li
                key={admin.id}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-neutral-800/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/20">
                    <User className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{admin.name}</p>
                    <p className="flex items-center gap-1.5 text-sm text-neutral-400">
                      <Mail className="h-3.5 w-3.5" />
                      {admin.email}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-primary-500/20 px-3 py-1 text-xs font-medium text-primary-400">
                  {ROLE_LABELS[admin.role as AdminRole]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
