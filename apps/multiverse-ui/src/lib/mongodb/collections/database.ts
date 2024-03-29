export interface DatabaseGet {
  codeName: string;
  name: string;
  region: string;
  dimensions: number;
  space: "l2" | "cosine" | "ip";
}

export const deleteAllDatabases = async() => {
    // Delete all databases

    return true;
};