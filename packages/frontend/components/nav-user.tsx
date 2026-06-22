"use client"

import { useRouter } from "next/navigation"
import {
  LogOutIcon,
  MoreVerticalIcon,
  UserCircleIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import api from "@/lib/api"

export function NavUser({
  user,
  onAccountClick,
}: {
  user: {
    name: string
    email: string
    safetag: string
    avatar: string | null | undefined
  }
  onAccountClick?: () => void
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()

  const handleLogout = async () => {
    await api.post('/auth/magic-link/logout').catch(() => {})
    router.push('/login')
  }

  const initial = (user.name?.[0] || user.safetag?.[1] || 'S').toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-[9px] px-3 py-[9px] rounded-[10px] cursor-pointer transition-colors hover:bg-[#f8f9fa]">
              <div className="w-8 h-8 rounded-full bg-[#0f172a] flex items-center justify-center text-[#10b981] font-black text-[13px] font-['Inter_Tight',sans-serif] shrink-0 overflow-hidden">
                {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : initial}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[12.5px] font-bold text-[#0f172a] truncate">{user.name}</p>
                <p className="text-[10.5px] text-[#94a3b8] mt-px truncate">{user.safetag}</p>
              </div>
              <MoreVerticalIcon className="size-3 text-[#cbd5e1] shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex flex-col px-1 py-1.5 text-left text-sm">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onAccountClick}>
                <UserCircleIcon />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
