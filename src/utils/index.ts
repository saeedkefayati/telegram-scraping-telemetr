import { translate } from "@vitalets/google-translate-api";
import translations from "../translation";

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function translateArrayToEnglish(arr: string[]): Promise<string[]> {
	const translated: string[] = [];
	for (const text of arr) {
		try {
			const res = await translate(text, { to: "en" });
			translated.push(res.text);
		} catch (error) {
			console.error("Translation error:", error);
			translated.push(text);
		}
	}
	return translated;
}

export function t(text: string): string {
	return translations[text] || text;
}

// export async function translateToEnglish(text: string): Promise<string> {
//     try {
//         const res = await translate(text, {
//             to: 'en', //client: 'gtx'
//         });
//         return res.text;
//     } catch (error) {
//         console.error('Translation error:', error);
//         return text;
//     }
// }
