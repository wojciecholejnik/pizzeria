import {templates, select } from '../settings.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DataPicker.js';

class Booking {
  constructor (bookingElement) {
    const thisBooking = this;

    thisBooking.render(bookingElement);
    thisBooking.initWidgets();
  }

  render (bookingElement) {
    const thisBooking = this;

    const HTML = templates.bookingWidget();
    thisBooking.dom = {};
    thisBooking.dom.wrapper = bookingElement;
    thisBooking.dom.wrapper.innerHTML = HTML;
    thisBooking.dom.peopleAmount = document.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = document.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    //console.log('thisBooking.dom.datePicker : ', thisBooking.dom.datePicker);
  }

  initWidgets () {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
  }

}

export default Booking;
