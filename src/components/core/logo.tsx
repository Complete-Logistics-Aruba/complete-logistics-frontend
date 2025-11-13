"use client";

import type * as React from "react";
import Box from "@mui/material/Box";

import { NoSsr } from "@/components/core/no-ssr";

const HEIGHT = 60;
const WIDTH = 60;

type Color = "dark" | "light";

export interface LogoProps {
	color?: Color;
	emblem?: boolean;
	height?: number;
	width?: number;
}

export function Logo({ emblem, height = HEIGHT, width = WIDTH }: LogoProps): React.JSX.Element {
	const url = emblem ? "/assets/logo_symbol.png" : "/assets/logo_full.png";
	return <Box alt="logo" component="img" height={height} src={url} width={width} />;
}

export interface DynamicLogoProps {
	// Keep these for backward compatibility but prefix with underscore
	_colorDark?: Color;
	_colorLight?: Color;
	emblem?: boolean;
	height?: number;
	width?: number;
}

export function DynamicLogo({
	// Keep these parameters but don't use them - just for backward compatibility
	_colorDark = "light",
	_colorLight = "dark",
	height = HEIGHT,
	width = WIDTH,
	...props
}: DynamicLogoProps): React.JSX.Element {
	return (
		<NoSsr fallback={<Box sx={{ height: `${height}px`, width: `${width}px` }} />}>
			<Logo height={height} width={width} {...props} />
		</NoSsr>
	);
}
