import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
const ConfirmationContext=createContext(null);
export const useConfirmation=()=>useContext(ConfirmationContext);
export default function ConfirmationProvider({children}){
 const [request,setRequest]=useState(null),pending=useRef(null),dialog=useRef(null),cancel=useRef(null);
 function finish(value){const resolve=pending.current;pending.current=null;dialog.current?.close();setRequest(null);resolve?.(value);}
 function ask(options){if(pending.current)return Promise.resolve(false);return new Promise(resolve=>{pending.current=resolve;setRequest(options);});}
 useEffect(()=>{if(request){dialog.current.showModal();cancel.current?.focus();}},[request]);
 useEffect(()=>()=>pending.current?.(false),[]);
 return <ConfirmationContext.Provider value={ask}>{children}{request&&<dialog ref={dialog} className="confirmation-dialog" aria-labelledby="confirmation-title" aria-describedby="confirmation-message" onCancel={e=>{e.preventDefault();finish(false);}}><h2 id="confirmation-title">{request.title}</h2><p id="confirmation-message">{request.message}</p><div className="confirmation-actions"><button ref={cancel} type="button" className="secondary" onClick={()=>finish(false)}>Cancel</button><button type="button" className={request.danger?'primary confirmation-danger':'primary'} onClick={()=>finish(true)}>{request.confirmLabel||'Confirm'}</button></div></dialog>}</ConfirmationContext.Provider>;
}
