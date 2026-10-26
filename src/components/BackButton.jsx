import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
export default function BackButton({children='Back',className='',onClick,...props}){
 const navigate=useNavigate();
 const back=()=>{if(window.history.state?.idx>0)navigate(-1);else navigate('/home',{replace:true});};
 return <button type="button" {...props} onClick={onClick||back} className={`inline-flex shrink-0 items-center gap-2 rounded-md py-1 text-sm text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${className}`}><ChevronLeft size={16} aria-hidden="true"/>{children}</button>;
}
