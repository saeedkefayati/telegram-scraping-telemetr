export type ChartData = Record<string, string | number> | null;

export type DataType = {
	id: string;
	created_at: string;
	updated_at: string;
	username: string;
	avatar: string;
	link: string;
	title: string;
	description: string;
	stats: string[];
	subscribers: {
		description: string;
		total: string;
		today: string;
		chart: ChartData;
	};
	views_per_post: {
		description: string;
		total: string;
		chart: ChartData;
	};
	ER: {
		description: string;
		general: string;
		daily: string;
	};
	DOP: {
		description: string;
		chart: ChartData;
	};
	posts: {
		created_at: string;
		views: string;
		comments: string;
		replies: string;
		content: string;
		emojies: {
			emoji: string;
			content: string;
		}[];
	}[];
};
