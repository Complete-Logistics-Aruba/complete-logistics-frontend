"use client";

import type * as React from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";

import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "@/components/core/toaster";

// Default user info will be overridden by auth context

function SignOutButton(): React.JSX.Element {
	const { logout } = useAuth();

	const handleSignOut = async () => {
		try {
			await logout();
			// logout() handles navigation to /auth/login, so no need to navigate here
			toast.success("Signed out.");
		} catch (error) {
			console.error("Sign out error:", error);
			toast.error("Failed to sign out.");
		}
	};

	return (
		<MenuItem onClick={handleSignOut} sx={{ justifyContent: "center" }}>
			Sign out
		</MenuItem>
	);
}

export interface UserPopoverProps {
	anchorEl: null | Element;
	onClose?: () => void;
	open: boolean;
}

export function UserPopover({ anchorEl, onClose, open }: UserPopoverProps): React.JSX.Element {
	const { user } = useAuth();

	return (
		<Popover
			anchorEl={anchorEl}
			anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
			onClose={onClose}
			open={Boolean(open)}
			slotProps={{ paper: { sx: { width: "280px" } } }}
			transformOrigin={{ horizontal: "right", vertical: "top" }}
		>
			<Box sx={{ p: 2 }}>
				<Typography color="text.secondary" variant="body2">
					{user?.email || ""}
				</Typography>
				{user?.role && (
					<Typography color="primary" variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
						Role: {user.role}
					</Typography>
				)}
			</Box>
			{/* <Divider />
			<List sx={{ p: 1 }}>
				
			</List> */}
			<Divider />
			<Box sx={{ p: 1 }}>
				<SignOutButton />
			</Box>
		</Popover>
	);
}
