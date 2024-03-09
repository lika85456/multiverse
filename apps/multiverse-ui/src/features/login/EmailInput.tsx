import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IoArrowForward } from "react-icons/io5";

export default function EmailInput() {
    return (
        <div className="flex w-full max-w-sm items-center ">
            <Input
                type="email"
                placeholder="email@example.com"
                className="rounded-r-none border-r-0"
            />
            <Button
                type="submit"
                className="rounded-l-none bg-accent text-primary hover:bg-accent_light"
            >
                <IoArrowForward className="w-6 h-6 text-accent-foreground" />
            </Button>
        </div>
    );
}