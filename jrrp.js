function getTodayFullDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    return new Date(year, month, day);
}
function rp_value_constructor(qqid){
    var jrrp_value={
        id:qqid,
        date:getTodayFullDate(),
        rp_value:Math.floor(Math.random()*100)
    }
    return jrrp_value
}

class Jrrp{
    jrrpDict
    constructor() {
        this.jrrpDict={}
        //this.rcli=rcli
    }

    find_jrrp(qqid){//to do: implement sql/redisnpm
        //return this.jrrpDict.find(jrrp_value=>jrrp_value.id==qqid)
        if (typeof this.jrrpDict[qqid]== 'undefined'){
            return
        }
        return {
            id:qqid,
            date:this.jrrpDict[qqid].date,
            rp_value:this.jrrpDict[qqid].rp_value
        }
    }

    insert_jrrp(rpobj){//
        this.jrrpDict[rpobj.id]={
            date:rpobj.date,
            rp_value:rpobj.rp_value
        }
        //this.jrrpDict.push(rpobj)
    }

    update_jrrp(qqid){
        const check_jrrp=this.find_jrrp(qqid)
        if (typeof check_jrrp == 'undefined'){
            console.log("update_jrrp()-> Error: the qqid is not exist!!!")
            return
        }
        this.jrrpDict[qqid].rp_value=Math.floor(Math.random()*100)
    }

    get_jrrp(qqid){
        const check_jrrp=this.find_jrrp(qqid)
        if (typeof check_jrrp == 'undefined'){
            var new_jrrp=rp_value_constructor(qqid)
            //console.log(new_jrrp)
            this.insert_jrrp(new_jrrp)
            return this.find_jrrp(qqid).rp_value
        }
        const today_date=getTodayFullDate()
        if(today_date.getTime()!==check_jrrp.date.getTime()){
            this.update_jrrp(qqid)
        }
        return this.find_jrrp(qqid).rp_value
    }
}
module.exports={Jrrp}
