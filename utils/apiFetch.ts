import { API_BASE_URL } from "@/app/config";


export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    try {
        const res = await fetch(`${API_BASE_URL}${url}`, {
            credentials: "include",
            ...options,
        });

        // Check if response is JSON before parsing
        const contentType = res.headers.get("content-type");
        const isJson = contentType?.includes("application/json");

        let data: any;
        
        if (isJson) {
            try {
                data = await res.json();
            } catch (jsonErr) {
                throw new Error(`Failed to parse JSON response: ${res.status} ${res.statusText}`);
            }
        } else {
            // If not JSON, get text for error message
            const text = await res.text();
            if (!res.ok) {
                // Clean up HTML error messages
                if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                    throw new Error(`Request failed with status ${res.status}. The API endpoint may not exist or the server is unavailable.`);
                }
                throw new Error(`Request failed with status ${res.status}: ${text.substring(0, 200).replace(/\s+/g, ' ').trim()}`);
            }
            throw new Error(`Expected JSON response but received ${contentType || 'unknown content type'}`);
        }

        if(!res.ok) {
            const message = data?.message || `Request failed with status ${res.status}`;
            throw new Error(message);
        }

        return data as T;
    } catch (err: any) {
        // If it's already an Error, throw it as-is, otherwise convert to string
        if (err instanceof Error) {
            throw err;
        }
        const mes = err + '';
        throw new Error(mes);
    }
    
}