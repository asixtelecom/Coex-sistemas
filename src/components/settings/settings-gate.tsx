'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function SettingsGate({ children }: { children: React.ReactNode }) {
  const { canEditSettings, canEditOwnProfile, accountRole } = useAuth();
  const router = useRouter();

  const blocked = useMemo(() => {
    if (accountRole === null) return false;
    return !canEditSettings && !canEditOwnProfile;
  }, [canEditSettings, canEditOwnProfile, accountRole]);

  if (!blocked) return <>{children}</>;

  return (
    <Dialog open>
      <DialogContent
        className="border-destructive/50 bg-destructive/5 sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="size-6" />
            Acesso negado
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-foreground/80">
            Esta Ã© a primeira e Ãºltima vez que vocÃª faz isso. Mais uma
            tentativa serÃ¡ notificada ao administrador do sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => router.replace('/dashboard')}
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
