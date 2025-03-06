import { toast } from "sonner";
import { MdError } from "react-icons/md";
import { IoCheckmarkCircle } from "react-icons/io5";
import { RiInformationFill } from "react-icons/ri";
import { IoIosWarning } from "react-icons/io";

const customToast = (message: string) => {
    toast(message);
};

const successToast = (message: string) => {
    toast.success(<div className="flex flex-row items-center text-primary-foreground">
        <IoCheckmarkCircle className="w-6 h-6 text-success mr-2" />
        {message}
    </div>);
};

const errorToast = (message: string) => {
    toast.error(<div className="flex flex-row items-center text-error">
        <MdError className="w-6 h-6 mr-2"/>
        {message}
    </div>);
};

const warningToast = (message: string) => {
    toast.warning(<div className="flex flex-row items-center text-warning">
        <IoIosWarning className="w-6 h-6 mr-2"/>
        {message}
    </div>);
};

const infoToast = (message: string) => {
    toast.info(<div className="flex flex-row items-center text-primary-foreground">
        <RiInformationFill className="w-6 h-6 mr-2"/>
        {message}
    </div>);
};

customToast.error = errorToast,
customToast.success = successToast,
customToast.warning = warningToast,
customToast.info = infoToast;

export { customToast };