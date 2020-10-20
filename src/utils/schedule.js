import {getDateIso, datediff} from "./date"
import {KEY_DIVIDER, SCHED_EXECUTED_PREFIX} from "../components/account/keys";
import {DAILY_FREQ, WEEKLY_FREQ, BI_WEEKLY_FREQ, MONTHLY_FREQ, YEARLY_FREQ, ONCE_FREQ} from "../components/account/details";

export const SCHED_RUN_LOG_ID = "schedRunLog"
export function processSchedule(db, budget, forceRun) {
    let lastRunDate = null
    const now = new Date()
    const time = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds()
    now.setHours(0,0,0,0)
    let schedLog = {_id: SCHED_RUN_LOG_ID}
    // https://github.com/pouchdb/upsert

    if (forceRun)
        runSchedItems(forceRun)
    else
    {
        db.get(SCHED_RUN_LOG_ID).then(function (doc) {
            schedLog = doc
            lastRunDate = new Date(doc.date)
            if (lastRunDate !== null)
                lastRunDate.setHours(0, 0, 0, 0)
            runSchedItems(forceRun)
        }).catch(function (err) {
            runSchedItems(forceRun)
        })
    }

    function validWeekSched(dateCopy, sched, noDays)
    {
        const diff = datediff(sched.date, dateCopy)
        return (dateCopy.getTime() !== sched.date.getTime()) && (diff == 0 || (diff % noDays === 0))
    }

    function runSchedItems(forceRun) {
        try {
            if (forceRun || lastRunDate === null || lastRunDate < now) {
                let startDate = new Date()
                if (lastRunDate !== null)
                {
                    // add one to last run date
                    startDate = new Date(lastRunDate.getTime())
                    startDate.setDate(startDate.getDate() + 1)
                }
                startDate.setHours(0, 0, 0, 0)
                const scheds = budget.getTxnsScheds()
                // run through all dates from date of last run until now
                for (var runDate = startDate; runDate <= now; runDate.setDate(runDate.getDate() + 1)) {
                    const dateCopy = new Date(runDate.getTime())
                    dateCopy.setHours(0, 0, 0, 0)
                    for (let sched of scheds) {
                        if (dateCopy >= sched.date) {
                            switch (sched.freq) {
                                case ONCE_FREQ:
                                    // if sched.id is not in the sched run doc list for today then run = true
                                    if (dateCopy.getTime() === sched.date.getTime())
                                        executeSchedAction(db, budget, sched, dateCopy, actionScheduleEvent, false)
                                    break
                                case DAILY_FREQ:
                                    // if no entry exists for the sched.id in the sched run doc list for today then run = true
                                    executeSchedAction(db, budget, sched, dateCopy, actionScheduleEvent, false)
                                    break
                                case WEEKLY_FREQ:
                                    if (validWeekSched(dateCopy, sched, 7))
                                        executeSchedAction(db, budget, sched, dateCopy, actionScheduleEvent, false)
                                    break
                                case BI_WEEKLY_FREQ:
                                    // if today - sched.date / 14 is 0 and an entry for todays date is not in run doc list for today then run = true
                                    if (validWeekSched(dateCopy, sched, 14))
                                        executeSchedAction(db, budget, sched, dateCopy, actionScheduleEvent, false)
                                    break
                                case MONTHLY_FREQ:
                                    if (dateCopy.getTime() !== sched.date.getTime() && dateCopy.getDate() === sched.date.getDate())
                                        executeSchedAction(db, budget, sched, dateCopy, actionScheduleEvent, false)
                                    break
                                case YEARLY_FREQ:
                                    if (dateCopy.getTime() !== sched.date.getTime() && dateCopy.getMonth() === sched.date.getMonth() && dateCopy.getDate() === sched.date.getDate())
                                        executeSchedAction(db, budget, sched, dateCopy, actionScheduleEvent, false)
                                    break
                            }
                        }
                    }
                }
                schedLog.date = getDateIso(now)
                schedLog.time = time
                db.put(schedLog)
            }
        } catch (err) {
            console.log(err)
        }
    }
}

export function executeSchedAction(db, budget, sched, runDate, postfetchFn, runOnFound)
{
    const logId = getSchedExecuteId(sched, runDate)
    const acc = sched.taccObj
    db.get(logId).then(function(res){
        if (runOnFound)
            postfetchFn(db, budget, acc, sched, runDate)
    })
        .catch(function(err){
            console.log(err)
        if (!runOnFound)
            postfetchFn(db, budget, acc, sched, runDate)
        })
}

export function actionScheduleEvent(db, budget, acc, sched, runDate)
{
    budget.addSchedToBudget(db, sched, acc, postProcessSchedule, runDate)
}

function postProcessSchedule(db, err, sched, runDate)
{
    if (typeof err === "undefined" || err === null)
        logSchedExecuted(db, sched, runDate)
}

export function getSchedExecuteId(sched, date)
{
    let id = SCHED_EXECUTED_PREFIX + sched.id + KEY_DIVIDER
    if (date !== null)
     id += getDateIso(date)
    return id
}

export function logSchedExecuted(db, sched, actionDate)
{
    const logId = getSchedExecuteId(sched, actionDate)
    db.put(
        {
            _id: logId
        }
    )
        .catch(function(err){console.log('logSchedActioned failed: ' + err)})
}
