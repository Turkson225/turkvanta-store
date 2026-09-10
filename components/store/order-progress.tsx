import {Check, Package, Truck, CircleCheck, Clock3, CircleAlert} from 'lucide-react';
import type {StoreOrder} from '@/lib/store/types';

const stages = [
  {value:'unfulfilled', label:'Confirmed', Icon:Package},
  {value:'processing', label:'Preparing', Icon:Package},
  {value:'shipped', label:'Shipped', Icon:Truck},
  {value:'delivered', label:'Delivered', Icon:CircleCheck},
];
const paymentLabels:Record<string,string> = {
  pending:'Awaiting payment', paid:'Paid', failed:'Payment unsuccessful',
  expired:'Checkout expired', refunded:'Refunded', reconciliation:'Payment under review',
};
const deliveryLabels:Record<string,string> = {
  unfulfilled:'Order confirmed', processing:'Preparing your order', shipped:'On the way',
  delivered:'Delivered', cancelled:'Cancelled',
};

export function OrderBadge({order}:{order:StoreOrder}) {
  const label = order.payment_status==='refunded' ? (order.fulfillment_status==='cancelled'?'Refunded · Cancelled':'Refunded')
    : order.fulfillment_status==='cancelled' ? 'Cancelled'
    : order.payment_status==='paid' ? deliveryLabels[order.fulfillment_status]??'Delivery update pending'
    : paymentLabels[order.payment_status]??'Status update pending';
  const tone = order.fulfillment_status==='cancelled' ? 'neutral'
    : order.payment_status==='paid' ? 'success'
    : ['failed','expired','reconciliation'].includes(order.payment_status) ? 'attention' : 'neutral';
  return <span className={`customer-status ${tone}`}>{label}</span>;
}

export function OrderPaymentStatus({order}:{order:StoreOrder}) {
  return <p className="order-payment-line"><strong>Payment:</strong> {paymentLabels[order.payment_status]??'Status update pending'}</p>;
}

export function OrderProgress({order}:{order:StoreOrder}) {
  const stage = stages.findIndex(item=>item.value===order.fulfillment_status);
  const hasShipment = stage>=2;
  const canShowProgress = stage>=0 && (order.payment_status==='paid'||hasShipment);
  if(order.fulfillment_status==='cancelled')return <p className="order-progress-message"><CircleAlert size={20} aria-hidden="true"/><span>This order has been cancelled.{order.payment_status==='refunded'?' Your payment has been refunded.':''}</span></p>;
  if(!canShowProgress)return <p className="order-progress-message"><Clock3 size={20} aria-hidden="true"/>{order.payment_status==='reconciliation'?'Your payment is being reviewed. Contact our team for an update.':order.payment_status==='refunded'?'This payment has been refunded.':order.payment_status==='pending'?'Delivery updates will appear after your payment is confirmed.':'Delivery updates are not available for this order yet.'}</p>;
  return <div className="order-progress">
    <ol aria-label="Order delivery progress">
      {stages.map(({value,label,Icon},index)=><li key={value} className={index<=stage?'reached':''} aria-current={index===stage?'step':undefined}>
        <span className="progress-dot" aria-hidden="true">{index<stage?<Check size={17}/>:<Icon size={17}/>}</span>
        <span>{label}<span className="sr-only">{index<stage?' — complete':index===stage?' — current stage':' — upcoming'}</span></span>
      </li>)}
    </ol>
    {order.tracking&&<p className="tracking-reference"><Truck size={17} aria-hidden="true"/><span>Tracking reference <strong>{order.tracking}</strong></span></p>}
  </div>;
}
