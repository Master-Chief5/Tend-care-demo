import { TeamChat } from '../components/TeamChat'

// Team chat (mobile "Team" tab). Real, house-scoped messaging — see TeamChat.
export function ScreenA_Chat({ user }) {
  return <TeamChat user={user} />
}
