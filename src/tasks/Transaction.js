import SubProcess from './SubProcess';

export default function Transaction(activityDef, context) {
  const transaction = {...activityDef, isTransaction: true};
  const activity = SubProcess(transaction, context);
  return activity;
}