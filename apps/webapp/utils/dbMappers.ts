// Helper to convert Supabase data (snake_case) to our app's types (camelCase)
export const fromSupabase = (data: any): any => {
    if (!data) return null;
    if (Array.isArray(data)) return data.map(fromSupabase);

    const camelCased: { [key: string]: any } = {};
    for (const key in data) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        camelCased[camelKey] = data[key];
    }
    return camelCased;
};

// Helper to convert our app's types (camelCase) to Supabase data (snake_case)
export const toSupabase = (data: any): any => {
    if (!data) return null;
    
    const snakeCased: { [key: string]: any } = {};
    for (const key in data) {
        // Avoid converting properties that are already snake_cased or special cases
        if (key.includes('_')) {
            snakeCased[key] = data[key];
            continue;
        }
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeCased[snakeKey] = data[key];
    }
    return snakeCased;
};
