import { trpc } from "@/_trpc/client";
import { IoAdd } from "react-icons/io5";
import { Button } from "@/components/ui/button";

export default function AddAWSTokenModal() {
    const mutation = trpc.addAwsToken.useMutation();

    const handleAddAwsToken = () => {
        mutation.mutate({
            accessTokenId: "44b2d438d65261a9eb14f61b215a13e974342afe8f5d811",
            secretAccessKey:
        "c975e5a171bcde0588a51e2d7a5d6b2e7696a38639aba7f92724dedaa37b6c4c650d9f7f72e174314c172874f4314e5a746066c26c35c9631",
        });
    };

    return (
        <Button
            className="self-center flex w-fit bg-accent text-accent-foreground hover:bg-accent_light"
            onClick={handleAddAwsToken}
        >
            <IoAdd className="w-6 h-6 mr-2" />
      Add AWS Token
        </Button>
    );
}