export function getDateIso(date)
{
    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate())
}

function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return number;
}

export function formatDate(date, includeTime)
{
    includeTime = typeof includeDate === "undefined" ? false : includeTime
    return includeTime? date.toString() : date.toDateString()
}

export function getMonthDigit(date)
{
  return ("0" + (date.getMonth() + 1)).slice(-2)
}

// https://stackoverflow.com/questions/3177836/how-to-format-time-since-xxx-e-g-4-minutes-ago-similar-to-stack-exchange-site
// but used - https://stackoverflow.com/questions/3177836/how-to-format-time-since-xxx-e-g-4-minutes-ago-similar-to-stack-exchange-site/23259289#23259289
export var timeSince = function(date) {
  if (typeof date !== 'object') {
    date = new Date(date);
  }

  var seconds = Math.floor((new Date() - date) / 1000);
  var intervalType;

  var interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    intervalType = 'year';
  } else {
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
      intervalType = 'month';
    } else {
      interval = Math.floor(seconds / 86400);
      if (interval >= 1) {
        intervalType = 'day';
      } else {
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) {
          intervalType = "hour";
        } else {
          interval = Math.floor(seconds / 60);
          if (interval >= 1) {
            intervalType = "minute";
          } else {
            interval = seconds;
            intervalType = "second";
          }
        }
      }
    }
  }

  if (interval > 1 || interval === 0) {
    intervalType += 's';
  }

  return interval + ' ' + intervalType;
};

// https://stackoverflow.com/questions/542938/how-do-i-get-the-number-of-days-between-two-dates-in-javascript
export function datediff(first, second) {
    // Take the difference between the dates and divide by milliseconds per day.
    // Round to nearest whole number to deal with DST.
    return Math.round((second-first)/(1000*60*60*24));
}

// https://stackoverflow.com/questions/1579010/get-next-date-from-weekday-in-javascript
export function nextDate(x){
    var now = new Date()
    now.setDate(now.getDate() + (x+(7-now.getDay())) % 7)
    return now
}

// https://stackoverflow.com/questions/2706125/javascript-function-to-add-x-months-to-a-date/2706169
export function addMonths(date, months) {
    var d = date.getDate();
    date.setMonth(date.getMonth() + +months);
    if (date.getDate() != d) {
      date.setDate(0);
    }
    return date;
}
