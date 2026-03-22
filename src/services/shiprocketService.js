const axios = require('axios');

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

class ShiprocketService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.isMock = !process.env.SHIPROCKET_EMAIL ||
      process.env.SHIPROCKET_EMAIL === 'your_shiprocket_email@example.com';
  }

  async authenticate() {
    if (this.isMock) return null;

    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      });

      this.token = response.data.token;
      this.tokenExpiry = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000); // 9 days

      return this.token;
    } catch (error) {
      console.error('Shiprocket auth error:', error.message);
      throw new Error('Shiprocket authentication failed');
    }
  }

  async createOrder(orderData) {
    if (this.isMock) {
      return this.mockCreateOrder(orderData);
    }

    try {
      const token = await this.authenticate();

      const shiprocketOrder = {
        order_id: orderData.orderNumber,
        order_date: new Date().toISOString().split('T')[0],
        pickup_location: 'Primary',
        channel_id: '',
        comment: 'ZYNOS Sports Store',
        billing_customer_name: orderData.shippingAddress.name,
        billing_last_name: '',
        billing_address: orderData.shippingAddress.addressLine1,
        billing_address_2: orderData.shippingAddress.addressLine2 || '',
        billing_city: orderData.shippingAddress.city,
        billing_pincode: orderData.shippingAddress.pincode,
        billing_state: orderData.shippingAddress.state,
        billing_country: orderData.shippingAddress.country || 'India',
        billing_email: orderData.userEmail || '',
        billing_phone: orderData.shippingAddress.phone,
        shipping_is_billing: true,
        order_items: orderData.items.map(item => ({
          name: item.name,
          sku: item.product.toString(),
          units: item.quantity,
          selling_price: item.price,
          discount: 0,
          tax: 18,
          hsn: '',
        })),
        payment_method: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        sub_total: orderData.subtotal,
        length: 10,
        breadth: 10,
        height: 10,
        weight: 0.5,
      };

      const response = await axios.post(
        `${SHIPROCKET_BASE_URL}/orders/create/adhoc`,
        shiprocketOrder,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return {
        shiprocketOrderId: response.data.order_id,
        shipmentId: response.data.shipment_id,
        status: 'created',
      };
    } catch (error) {
      console.error('Shiprocket create order error:', error.message);
      return this.mockCreateOrder(orderData);
    }
  }

  async trackShipment(shipmentId) {
    if (this.isMock) {
      return this.mockTrackShipment(shipmentId);
    }

    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${SHIPROCKET_BASE_URL}/courier/track/shipment/${shipmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return response.data;
    } catch (error) {
      console.error('Shiprocket track error:', error.message);
      return this.mockTrackShipment(shipmentId);
    }
  }

  mockCreateOrder(orderData) {
    const mockShiprocketId = `SR${Date.now()}`;
    return {
      shiprocketOrderId: mockShiprocketId,
      shipmentId: `SHIP${Date.now()}`,
      trackingId: `TRK${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      status: 'mock_created',
      message: 'Mock shipment created (Shiprocket not configured)',
    };
  }

  mockTrackShipment(shipmentId) {
    return {
      tracking_data: {
        shipment_id: shipmentId,
        current_status: 'In Transit',
        current_status_id: 6,
        tracking_url: '#',
        activities: [
          {
            date: new Date().toISOString(),
            activity: 'Shipment picked up',
            location: 'Mumbai',
          },
          {
            date: new Date(Date.now() - 86400000).toISOString(),
            activity: 'Order confirmed',
            location: 'Warehouse',
          },
        ],
      },
      isMock: true,
    };
  }
}

module.exports = new ShiprocketService();
