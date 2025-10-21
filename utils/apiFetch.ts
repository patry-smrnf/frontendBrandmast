import { API_BASE_URL } from "@/app/config";


export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    try {
        const res = await fetch(`${API_BASE_URL}${url}`, {
            credentials: "include",
            ...options,
        });

        const data = await res.json();

        if(!res.ok) {
            const message = data?.message || `Request failed with status ${res.status}`;
            throw new Error(message);
        }

        return data as T;
    } catch (err: any) {
        const mes = err + '';
        throw (mes);
    }
    
}