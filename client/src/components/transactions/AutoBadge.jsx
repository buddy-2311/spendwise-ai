import { Repeat } from 'lucide-react';

const AutoBadge = () => {
    return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary ml-2 tracking-wider">
            <Repeat size={10} />
            <span>AUTO</span>
        </span>
    );
};

export default AutoBadge;
