import { IoAdd } from "react-icons/io5";
import { FaRegCopy } from "react-icons/fa";

import type { DatabaseItemProps } from "@/app/databases/components/DatabaseItem";
import DatabaseItem from "@/app/databases/components/DatabaseItem";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface DatabaseListProps {
  items: DatabaseItemProps[];
}

export default function DatabaseList({ items }: DatabaseListProps) {
    const databaseItems = items.map((item) => {
        return (
            <li key={item.databaseItem.databaseId}>
                <DatabaseItem databaseItem={item.databaseItem} />
            </li>
        );
    });

    return (
        <>
            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        className={
                            "self-end bg-accent text-accent-foreground font-medium hover:bg-accent_light"
                        }
                    >
                        <IoAdd className={"w-8 h-8 mr-1"} />
            Create database
                    </Button>
                </DialogTrigger>
                <DialogContent className={"border-0 bg-secondary"}>
                    <DialogHeader>
                        <DialogTitle>Create Database</DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col items-start gap-4">
                        <Label htmlFor="dbName" className="text-right">
              Database name
                        </Label>
                        <Input
                            id="dbName"
                            defaultValue="Database1"
                            className="bg-inherit"
                        />
                    </div>
                    <div className="flex flex-col w-full items-start gap-4">
                        <Label htmlFor="metrics" className="text-right">
              Locality
                        </Label>
                        <Select>
                            <SelectTrigger className="w-full bg-secondary">
                                <SelectValue placeholder="Select a locality" />
                            </SelectTrigger>
                            <SelectContent className={"bg-primary border-0"}>
                                <SelectItem value="central_europe">Central Europe</SelectItem>
                                <SelectItem value="northern_europe">Northern Europe</SelectItem>
                                <SelectItem value="eastern_europe">Eastern Europe</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className={"flex flex-row w-full space-x-4"}>
                        <div className="flex flex-col w-full items-start gap-4">
                            <Label htmlFor="metrics" className="text-right">
                Locality
                            </Label>
                            <Select>
                                <SelectTrigger className="w-[280px] bg-secondary">
                                    <SelectValue placeholder="Select a metrics" />
                                </SelectTrigger>
                                <SelectContent className={"bg-primary border-0"}>
                                    <SelectItem value="dot_product">Dot Product</SelectItem>
                                    <SelectItem value="euclidean">Euclidean Distance</SelectItem>
                                    <SelectItem value="cosine">Cosine Similarity</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col w-full items-start gap-4">
                            <Label htmlFor="dimensions" className="text-right">
                Dimensions
                            </Label>
                            <Input
                                id="dimensions"
                                defaultValue="1536"
                                type={"number"}
                                className="bg-inherit"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            className={"bg-inherit border border-border hover:bg-secondary"}
                        >
                            <FaRegCopy className={"w-6 h-6 mr-2"} />
              Copy request
                        </Button>
                        <DialogClose asChild>
                            <Button
                                className={
                                    "bg-accent text-accent-foreground hover:bg-accent_light"
                                }
                                type="submit"
                            >
                                <IoAdd className={"w-8 h-8 mr-1"} />
                Create
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ul className={"flex flex-col w-full py-4 space-y-4"}>{databaseItems}</ul>
        </>
    );
}