import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { PublicProfileResponse } from '@/types/user.types'

type ProfileHeaderProps = {
  profile: PublicProfileResponse
}

function getInitials(displayName?: string | null, username?: string): string {
  const name = displayName ?? username ?? '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="flex items-start gap-6">
      <Avatar className="h-20 w-20 shrink-0">
        <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name ?? profile.username} />
        <AvatarFallback className="text-xl font-semibold">
          {getInitials(profile.display_name, profile.username)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-2xl font-semibold">{profile.display_name ?? profile.username}</h2>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
        {profile.bio && <p className="text-sm">{profile.bio}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {profile.location && <span>{profile.location}</span>}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              {profile.website}
            </a>
          )}
          {profile.entry_year && <span>Nhập học {profile.entry_year}</span>}
        </div>
      </div>
    </div>
  )
}
