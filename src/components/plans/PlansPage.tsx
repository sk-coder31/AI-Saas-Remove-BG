import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Star, CreditCard } from 'lucide-react';
import { Plan } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Extend the Window interface to include Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

const PlansPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const { user, updateCredits } = useAuth();

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      credits: 5,
      features: [
        '5 image credits',
        'High-quality processing',
        'Basic support',
        'Standard download speeds'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 499, // Price in INR
      credits: 100,
      popular: true,
      features: [
        '100 image credits',
        'High-quality processing',
        'Priority support',
        'Fast download speeds',
        'API access',
        'Bulk processing'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 1499, // Price in INR
      credits: 500,
      features: [
        '500 image credits',
        'Ultra high-quality processing',
        '24/7 priority support',
        'Fastest download speeds',
        'Full API access',
        'Unlimited bulk processing',
        'Custom integrations',
        'White-label solution'
      ]
    }
  ];

  const handlePayment = async (plan: Plan) => {
    if (plan.price === 0) {
      toast.success('You are already on the free plan!');
      return;
    }

    if (!user) {
      toast.error('Please login to purchase a plan');
      return;
    }

    setLoading(plan.id);

    try {
      // TODO: Replace with your actual backend endpoint to create order
      
      const orderResponse = await fetch('https://springboot-backend-md5u.onrender.com/api/image/create-order?amount=499&&currency=INR', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.price,
          currency: 'INR'
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const orderData = await orderResponse.json();
      

      // PLACEHOLDER: Mock order creation
      // const orderData = {
      //   id: 'order_' + Date.now(),
      //   amount: plan.price * 100, // Amount in paise
      //   currency: 'INR'
      // };

      // Initialize Razorpay
      const options = {
        key: 'rzp_test_VvOgTdmVcaIn3F', // TODO: Replace with your actual Razorpay key
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'BgRemover AI',
        description: `${plan.name} Plan - ${plan.credits} credits`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            // TODO: Verify payment with your backend
            
            const verifyResponse = await fetch(`https://springboot-backend-md5u.onrender.com/api/image/create-order?amount='${499}}&&currency=INR'`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id,
                credits: plan.credits
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            const verifyData = await verifyResponse.json();
            

            
            
          
            updateCredits((user?.credits || 0) + plan.credits);
            
            toast.success(`Payment successful! ${plan.credits} credits added to your account.`);
            console.log('Payment successful:', response);
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: '9865119549' // TODO: Add phone number to user profile
        },
        notes: {
          plan_id: plan.id,
          credits: plan.credits,
          user_id: user.id
        },
        theme: {
          color: '#7C3AED'
        },
        modal: {
          ondismiss: function() {
            setLoading(null);
            toast.info('Payment cancelled');
          }
        }
      };

      // Check if Razorpay is loaded
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.');
      }

      // Create Razorpay instance and open checkout
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error('Payment initialization failed:', error);
      toast.error(error.message || 'Payment initialization failed');
      setLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Select the perfect plan for your background removal needs. 
          All plans include our AI-powered processing and high-quality results.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className={`relative bg-white rounded-2xl shadow-xl border-2 overflow-hidden ${
              plan.popular ? 'border-purple-500 scale-105' : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center py-3 font-semibold">
                <Star className="w-5 h-5 inline mr-2" />
                Most Popular
              </div>
            )}

            <div className={`p-8 ${plan.popular ? 'pt-16' : ''}`}>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-center justify-center mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ₹{plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600 ml-2">/month</span>
                  )}
                </div>
                <div className="flex items-center justify-center text-purple-600">
                  <Zap className="w-5 h-5 mr-2" />
                  <span className="font-semibold">{plan.credits} credits</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePayment(plan)}
                disabled={loading === plan.id}
                className={`w-full py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>
                      {plan.price === 0 ? 'Current Plan' : `Get ${plan.name}`}
                    </span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-12"
      >
        <p className="text-gray-600 mb-4">
          All plans include our 30-day money-back guarantee
        </p>
        <p className="text-sm text-gray-500">
          Need a custom solution? 
          <a href="mailto:support@bgremover.ai" className="text-purple-600 hover:underline ml-1">
            Contact us
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default PlansPage;