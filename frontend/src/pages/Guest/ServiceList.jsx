import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { getServices } from '../../services/extraServiceApi';

const ServiceList = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await getServices(true);
        if (res.ok && res.data.success) {
          setServices(res.data.data);
        } else {
          throw new Error(res.data.message || 'Failed to fetch services');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center text-red-600 max-w-lg mx-auto">
        <div className="bg-red-50 p-6 rounded-xl border border-red-100">
          <p className="font-semibold text-lg mb-2">Oops! Something went wrong.</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3">
            <Sparkles size={18} /> Premium Add-ons
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Elevate Your Parking Experience
          </h2>
          <p className="text-lg text-gray-600">
            Choose from our exclusive range of extra services. From a sparkling car wash to dedicated valet, we ensure your vehicle gets the best treatment while you're away.
          </p>
        </div>

        {services.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            No premium services available at the moment. Please check back later.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map(service => (
              <div 
                key={service._id} 
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col border border-gray-100"
              >
                <div className="relative h-56 overflow-hidden">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                  <img 
                    src={service.imageUrl} 
                    alt={service.name} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out"
                  />
                  <div className="absolute bottom-4 left-4 z-20">
                    <span className="bg-white/90 backdrop-blur text-gray-900 font-bold px-4 py-1.5 rounded-full shadow-sm text-sm">
                      ${service.price.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 mb-6 flex-1 line-clamp-3 leading-relaxed">
                    {service.description}
                  </p>
                  
                  <ul className="mb-6 space-y-2 text-sm text-gray-500">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500" /> Professional staff
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500" /> Done during your parking time
                    </li>
                  </ul>

                  <Link 
                    to={`/services/${service._id}`}
                    className="block w-full text-center py-3 px-4 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-300"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceList;
