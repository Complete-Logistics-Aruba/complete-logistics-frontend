import React from "react";
import Skeleton from "@mui/material/Skeleton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";

interface TableSkeletonProps {
	/**
	 * Number of rows to display, default is 5 as specified in requirements
	 */
	rows?: number;
	/**
	 * Number of columns for each row
	 */
	columns: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns }) => {
	return (
		<>
			{Array.from({ length: rows }).map((_, rowIndex) => (
				<TableRow key={`skeleton-row-${rowIndex}`}>
					{Array.from({ length: columns }).map((_, cellIndex) => (
						<TableCell key={`skeleton-cell-${rowIndex}-${cellIndex}`}>
							<Skeleton animation="wave" height={24} />
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	);
};
