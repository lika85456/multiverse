export interface SecretToken {
    name: string;
    secret: string;
    validUntil: number;

}

export interface DatabaseGet {
  codeName: string;
  name: string;
  region: string;
  dimensions: number;
  space: "l2" | "cosine" | "ip";
  secretTokens: SecretToken[];
}

export const deleteAllDatabases = async() => {
    // Delete all databases

    return true;
};