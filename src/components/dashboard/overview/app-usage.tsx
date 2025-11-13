"use client";

import type * as React from "react";
import Card from "@mui/material/Card";

// const _bars = [
// 	{ name: "FCL Shipments", dataKey: "v1", color: "var(--mui-palette-primary-400)" },
// 	{ name: "LCL Shipments", dataKey: "v2", color: "var(--mui-palette-primary-600)" },
// ] satisfies { name: string; dataKey: string; color: string }[];

export interface AppUsageProps {
	data: { name: string; v1: number; v2: number }[];
}

export function AppUsage(): React.JSX.Element {
	return (
		<Card>
			{/* <CardHeader title="Monthly Shipping Volumes" />
			<CardContent>
				<Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
					<Stack spacing={3} sx={{ flex: "0 0 auto", justifyContent: "space-between", width: "240px" }}>
						<Stack spacing={2}>
							<Typography color="success.main" variant="h2">
								+32%
							</Typography>
							<Typography color="text.secondary">
								increase in shipping volume with{" "}
								<Typography color="text.primary" component="span">
									142
								</Typography>{" "}
								new shipments this month
							</Typography>
						</Stack>
						<div>
							<Typography color="text.secondary" variant="body2">
								<Typography color="primary.main" component="span" variant="subtitle2">
									FCL and LCL
								</Typography>{" "}
								shipments are showing consistent growth compared to last year's figures
							</Typography>
						</div>
					</Stack>
					<Stack divider={<Divider />} spacing={2} sx={{ flex: "1 1 auto" }}>
						<NoSsr fallback={<Box sx={{ height: `${chartHeight}px` }} />}>
							<ResponsiveContainer height={chartHeight}>
								<BarChart barGap={-32} data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
									<CartesianGrid strokeDasharray="2 4" vertical={false} />
									<XAxis axisLine={false} dataKey="name" tickLine={false} type="category" xAxisId={0} />
									<XAxis axisLine={false} dataKey="name" hide type="category" xAxisId={1} />
									<YAxis axisLine={false} domain={[0, 50]} hide tickCount={6} type="number" />
									{_bars.map(
										(bar, index): React.JSX.Element => (
											<Bar
												animationDuration={300}
												barSize={32}
												dataKey={bar.dataKey}
												fill={bar.color}
												key={bar.name}
												name={bar.name}
												radius={[5, 5, 5, 5]}
												xAxisId={index}
											/>
										)
									)}
									<Tooltip animationDuration={50} content={<TooltipContent />} cursor={false} />
								</BarChart>
							</ResponsiveContainer>
						</NoSsr>
						<Legend />
					</Stack>
				</Stack>
			</CardContent> */}
		</Card>
	);
}

// interface _TooltipContentProps {
// 	active?: boolean;
// 	payload?: { fill: string; name: string; dataKey: string; value: number }[];
// 	label?: string;
// }
