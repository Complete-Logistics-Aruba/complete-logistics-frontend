import React, { useState } from "react";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Switch,
	Typography,
} from "@mui/material";

import { featureFlags, FeatureFlags } from "@/config/feature-flags";

/**
 * Development-only component for toggling feature flags
 * Only shown in development mode
 */
export const FeatureFlagAdmin: React.FC = () => {
	const [open, setOpen] = useState(false);
	const [flags, setFlags] = useState<Partial<FeatureFlags>>({ ...featureFlags });

	// Only show in development mode
	if (!import.meta.env.DEV) {
		return null;
	}

	const handleClose = () => setOpen(false);

	const handleToggle = (flag: keyof FeatureFlags) => {
		setFlags((prev) => ({
			...prev,
			[flag]: !prev[flag],
		}));

		// This modifies the actual feature flags object for the current session
		(featureFlags as Record<keyof FeatureFlags, boolean>)[flag] = !featureFlags[flag];
	};

	return (
		<>
			<Box
				sx={{
					position: "fixed",
					right: 16,
					top: 70,
					zIndex: 9999,
				}}
			>
				{/* <IconButton
          onClick={handleOpen}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            width: 40,
            height: 40,
            fontSize: 20,
            fontWeight: 'bold'
          }}
        >
          FF
        </IconButton> */}
			</Box>

			<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
				<DialogTitle>Feature Flag Admin (Dev Only)</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Toggle feature flags for testing. These settings will reset when you refresh the page.
					</Typography>

					<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
						{(Object.keys(featureFlags) as Array<keyof FeatureFlags>).map((flag) => (
							<FormControlLabel
								key={flag}
								control={<Switch checked={!!flags[flag]} onChange={() => handleToggle(flag)} color="primary" />}
								label={flag}
							/>
						))}
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose}>Close</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};
