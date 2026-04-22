import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Receipt, CreditCard, Clock, MapPin, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

const VendorChallans = () => {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    fetchChallans();
    // Load Razorpay Script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchChallans = async () => {
    try {
      const response = await axios.get('/api/challans/my');
      setChallans(response.data);
    } catch (err) {
      console.error("Failed to fetch challans", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (challan) => {
    setPaying(challan.id);
    try {
      // 1. Create Order on Backend
      const orderRes = await axios.post(`/api/payments/create-order/${challan.id}`);
      const { orderId, amount, currency, keyId } = orderRes.data;

      // 2. Open Razorpay Checkout
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "SMC Solapur",
        description: `Challan Payment: ${challan.challanNumber}`,
        order_id: orderId,
        handler: async (response) => {
          // 3. Verify Payment on Backend
          try {
            const verifyRes = await axios.post('/api/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              challanId: challan.id
            });

            if (verifyRes.data) {
              alert("Payment Successful!");
              fetchChallans();
            } else {
              alert("Payment Verification Failed!");
            }
          } catch (err) {
            alert("Verification Error: " + err.message);
          }
        },
        prefill: {
          name: challan.vendor.name,
          contact: challan.vendor.phone
        },
        theme: {
          color: "#1e3a8a" // smc-blue
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert("Payment Initiation Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setPaying(null);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin text-smc-blue"><Receipt size={48} /></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Challans</h1>
          <p className="text-gray-500 text-sm">View and pay your pending fines</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-600 uppercase font-bold">Total Pending</p>
          <p className="text-xl font-bold text-smc-blue">
            ₹{challans.filter(c => c.status === 'UNPAID').reduce((acc, c) => acc + c.fineAmount, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {challans.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">No Challans Found!</h2>
          <p className="text-gray-500 mt-2">You don't have any pending or past challans.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {challans.map((challan) => (
            <div key={challan.id} className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-smc-blue">
              <div className="p-6 md:flex gap-6">
                <div className="md:w-1/4 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold">Challan No</p>
                    <p className="font-mono text-sm font-bold text-smc-blue">{challan.challanNumber}</p>
                  </div>
                  <div className={`p-4 rounded-lg flex items-center gap-2 ${
                    challan.status === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {challan.status === 'PAID' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="font-bold text-sm">{challan.status}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 mt-4 md:mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg text-smc-blue"><Receipt size={20} /></div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Reason</p>
                        <p className="text-sm font-semibold">{challan.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg text-smc-blue"><MapPin size={20} /></div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Location</p>
                        <p className="text-sm font-semibold">{challan.location}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg text-smc-blue"><Clock size={20} /></div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Issued At</p>
                        <p className="text-sm font-semibold">{new Date(challan.issuedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg text-smc-blue"><CreditCard size={20} /></div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Fine Amount</p>
                        <p className="text-lg font-bold text-red-600">₹{challan.fineAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {challan.imageProofUrl && (
                    <div className="pt-2">
                      <a 
                        href={`${challan.imageProofUrl}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-smc-blue text-sm font-semibold flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink size={14} /> View Evidence Photo
                      </a>
                    </div>
                  )}
                </div>

                <div className="md:w-1/4 flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                  {challan.status === 'UNPAID' ? (
                    <>
                      <button 
                        onClick={() => handlePayment(challan)}
                        disabled={paying === challan.id}
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CreditCard size={20} /> {paying === challan.id ? 'Processing...' : 'PAY NOW'}
                      </button>
                      <p className="text-[10px] text-center text-gray-500 uppercase tracking-tighter">
                        Secure Payment via Razorpay
                      </p>
                    </>
                  ) : (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Paid On</p>
                      <p className="text-sm font-bold text-gray-800">{new Date(challan.paidAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorChallans;
