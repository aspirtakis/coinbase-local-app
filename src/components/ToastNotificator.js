import React from 'react';
import { Toast, ToastBody, ToastHeader } from 'reactstrap';

const NotificationToast = ({ message, status, visible, onClose }) => {
  return (
    <Toast
      isOpen={visible}
      fade
      className="mt-3"
      style={{ position: 'fixed', bottom: 20, right: 20 }}
    >
      <ToastHeader
        toggle={onClose}
        icon={status === 'success' ? 'success' : 'danger'}
      >
        {status === 'success' ? 'Success' : 'Error'}
      </ToastHeader>
      <ToastBody>{message}</ToastBody>
    </Toast>
  );
};

export default NotificationToast;
