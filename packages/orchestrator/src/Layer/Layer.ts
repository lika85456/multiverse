import { createHash } from "crypto";
import { S3 } from "@aws-sdk/client-s3";

export default class Layer {

    private codeHash: string;

    constructor(private codeZipPath: string) {
        this.codeHash = createHash("sha256").update(codeZipPath).digest("hex");
    } 

    public async exists(): Promise<boolean> {
        // check s3 bucket for code

    }

    public async upload(): Promise<void> {
                
    }
}