"use client";

import { startTransition, useActionState } from "react";
import { updateAvatar, type ActionState } from "@/lib/actions/account";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";

const initial: ActionState = { ok: false };

/**
 * The customer's profile picture — shown at the top of the menu drawer.
 * The photo is shrunk on the phone and uploaded into the customer's own
 * folder; Save records it on their profile.
 */
export function AvatarForm({ userId, avatarUrl }: { userId: string; avatarUrl: string | null }) {
  const [state, action, pending] = useActionState(updateAvatar, initial);

  return (
    <Card className="p-5">
      <form
        action={action}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
        className="space-y-3"
      >
        <div>
          <p className="text-sm font-medium text-ink">Your picture</p>
          <p className="text-xs text-ink-muted">
            Shown when you open the menu. JPG, PNG or WebP.
          </p>
        </div>

        <div className="max-w-[10rem]">
          <ImageUploader
            name="avatar_url"
            bucket="avatars"
            folder={userId}
            single
            label="picture"
            maxBytes={1024 * 1024}
            maxEdge={400}
            deniedMessage="could not upload. Sign in again and retry."
            fileBase="avatar"
            initial={avatarUrl ? [avatarUrl] : []}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" loading={pending}>
            Save picture
          </Button>
          {state.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : state.ok && state.message ? (
            <p role="status" className="text-sm text-success">
              {state.message}
            </p>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
