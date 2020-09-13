import {templates, select, settings, classNames } from '../settings.js';
import {utils} from '../utils.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DataPicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor (bookingElement) {
    const thisBooking = this;

    thisBooking.render(bookingElement);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.selectTable();
    thisBooking.initBooking();
  }

  getData(){
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam,
      ],
    };
    //console.log('getData params', params);

    const urls = {
      booking:        settings.db.url + '/' + settings.db.booking
                                      + '?' + params.booking.join('&'),
      eventsCurrent:  settings.db.url + '/' + settings.db.event
                                      + '?' + params.eventsCurrent.join('&'),
      eventsRepeat:   settings.db.url + '/' + settings.db.event
                                      + '?' + params.eventsRepeat.join('&'),
    };
    //console.log('getData urls', urls);

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function(allResponeses){
        const bookingsResponese = allResponeses[0];
        const eventsCurrentResponese = allResponeses[1];
        const eventsRepeatRespose = allResponeses[2];
        return Promise.all([
          bookingsResponese.json(),
          eventsCurrentResponese.json(),
          eventsRepeatRespose.json(),
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsRepeat ]){
        // console.log(bookings);
        // console.log(eventsCurrentResponese);
        // console.log(eventsRepeat);
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat){
    const thisBooking = this;

    thisBooking.booked = {};

    for(let item of bookings){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for(let item of eventsCurrent){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;


    for(let item of eventsRepeat){
      if(item.repeat == 'daily'){
        for(let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)){
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }
    thisBooking.updateDOM();
    //console.log('thisBooking.booked', thisBooking.booked);
  }

  makeBooked(date, hour, duration, table){
    const thisBooking = this;

    if(typeof thisBooking.booked[date] == 'undefined'){
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for(let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5){
      //console.log('loop', hourBlock);
      if(typeof thisBooking.booked[date][hourBlock] == 'undefined'){
        thisBooking.booked[date][hourBlock] = [];
      }
      thisBooking.booked[date][hourBlock].push(table);

    }
  }

  updateDOM(){
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    let allAvailable = false;

    if(
      typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ){
      allAvailable = true;
    }

    for(let table of thisBooking.dom.tables){
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if(!isNaN(tableId)){
        tableId = parseInt(tableId);
      }

      if(
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ){
        table.classList.add(classNames.booking.tableBooked);
      } else{
        table.classList.remove(classNames.booking
          .tableBooked);
      }
    }
  }

  selectTable(){
    const thisBooking = this;

    for (let table of thisBooking.dom.tables){
      table.addEventListener('click', function () {

        table.classList.toggle(classNames.booking.choisedTable);
        const tableNumber = table.getAttribute(settings.booking.tableIdAttribute);
        thisBooking.bookedTable = parseInt(tableNumber);

        //console.log('thisBooking.bookedTable', thisBooking.bookedTable);

      });
    }
  }

  deleteSelection(){
    const thisBooking = this;

    for(let table of thisBooking.dom.tables){
      table.classList.remove(classNames.booking.choisedTable);
    }

    delete thisBooking.bookedTable;
  }

  initBooking(){
    const thisBooking = this;

    thisBooking.dom.formSubmit.addEventListener('submit', function(event){
      event.preventDefault();
      //console.log('submited');
      thisBooking.bookTable();
      thisBooking.deleteSelection();
      alert('Reservation accepted');
    });
    thisBooking.dom.hourPicker.addEventListener('updated', function(){
      thisBooking.deleteSelection();
    });
    thisBooking.dom.datePicker.addEventListener('updated', function(){
      thisBooking.deleteSelection();
    });
  }

  bookTable(){
    const thisBooking = this;

    const dataOrder = {
      date: thisBooking.datePicker.value,
      hour: thisBooking.hourPicker.value,
      table: thisBooking.bookedTable,
      duration: thisBooking.hoursAmount.value,
      ppl: thisBooking.peopleAmount.value,
      starters: [],
      address: thisBooking.dom.address.value,
      phone: thisBooking.dom.phone.value,
    };

    for(let starter of thisBooking.dom.starters){
      if(starter.checked === true){
        dataOrder.starters.push(starter.value);
      }
    }
    //console.log('dataOrder: ', dataOrder);

    const url = settings.db.url + '/' + settings.db.booking;
    //console.log('url: ', url);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataOrder),
    };

    fetch(url, options)
      .then(function(response){
        return response.json();
      }).then(function(parsedResponse){
        console.log('parsedResponse: ', parsedResponse);
      });
  }

  render(bookingElement){
    const thisBooking = this;

    const HTML = templates.bookingWidget();
    thisBooking.dom = {};
    thisBooking.dom.wrapper = bookingElement;
    thisBooking.dom.wrapper.innerHTML = HTML;
    thisBooking.dom.peopleAmount = document.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = document.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.cart.phone);
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.cart.address);
    thisBooking.dom.formSubmit = thisBooking.dom.wrapper.querySelector(select.booking.formSubmit);
    thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(select.booking.starters);
    //console.log('thisBooking.dom.phone : ', thisBooking.dom.phone);
    //console.log('thisBooking.dom.address : ', thisBooking.dom.address);
    //console.log('thisBooking.dom.formSubmit : ', thisBooking.dom.formSubmit);
  }

  initWidgets(){
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function(){
      thisBooking.updateDOM();
    });
  }

}

export default Booking;
