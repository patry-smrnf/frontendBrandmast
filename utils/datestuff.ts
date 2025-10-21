import { error } from "console";

export function FromStringExtractDateString(datetime: string, withDayOfWeek: boolean = false): string {
    const date = new Date(datetime);

    if(isNaN(date.getTime())) {
        throw new Error ("Invalid datetime format");
    }

    if(withDayOfWeek) {
        return date.toLocaleDateString("en-US", { weekday: "long"});
    }

    return date.toISOString().split("T")[0];
}

export function FromStringExtractHourString(datetime: string): string { 
      const date = new Date(datetime);

  if (isNaN(date.getTime())) {
    throw new Error("Invalid datetime format");
  }

  return date.toTimeString().slice(0, 5); // HH:MM
}

export function FromDateExtractHourString(datetime?: string | Date | null): string {
  if (!datetime) return "—";

  if (typeof datetime === "string") {
    // Extract the HH:MM from the string directly
    const match = datetime.match(/T(\d{2}:\d{2})/);
    if (match) return match[1];
  }

  // Fallback if it's already a Date object
  const date = new Date(datetime);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

export function FromDateExtractDateString(datetime: Date): string {
    return `${datetime.getFullYear()}-${datetime.getMonth()}-${datetime.getDay()}`;
}