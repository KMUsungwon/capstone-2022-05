import { Request, Response, NextFunction } from "express";
import { User } from '../entity/User';
import { Parent } from '../entity/Parent';
import { Mapping } from "../entity/Mapping";
import { WorkDiary } from "../entity/WorkDiary";
import { WorkDiaryImg } from "../entity/WorkDiaryImg";
import { Alarm } from "../entity/Alarm";

const getParentInfo = async (req: Request, res: Response, next: NextFunction) => {
    const parent_id: number = +req.params.parentId;
    
    const user = await Parent.findOne({parentId: parent_id});

    if(user) {
        res.status(200).json({
            parentInfo: user
        })
    }
    else {
        res.status(404).json({
            message: "아이 정보가 존재하지 않음"
        })
    }
};

const editParentInfo = async (req: Request, res: Response, next: NextFunction) => {
    const parent_id: number = +req.params.parentId;
    const updateInfo: object = req.body;

    const user = await Parent.findOne({parentId: parent_id});

    if (user) {
        await Parent.update({parentId: parent_id}, updateInfo)
        .then((result) => {
            res.status(200).json({
                success: true,
                message: "아이 정보 수정 완료",
            })
        })
        .catch((err) => {
            res.status(400).send(err);
        })
    }
    else {
        res.status(404).json({
            message: "아이 정보가 존재하지 않음"
        })
    }

};

const createParentInfo = async (req: Request, res: Response, next: NextFunction) => {
    const {babyName, babyBirth, babyGender, region, career} = req.body;

    const user_id: number = +req.params.id;

    const user = await User.findOne({userId: user_id});

    
    if (user) {
        const parent = new Parent();
        parent.babyName = babyName;
        parent.babyBirth = babyBirth;
        parent.babyGender = babyGender;
        parent.region = region;
        parent.career = career;
        parent.user = user;

        await parent.save()
        .then((result) => {
            res.status(201).json({
                success: true,
                message: "아이 정보 입력 완료",
                babyInfo: result,
            })
        })
        .catch((err) => {
            res.status(400).json(err);
        });
    }
    else {
        res.send("해당 유저 아이디가 존재하지 않습니다.");
    }
};

const getMainPage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parent_id: number = +req.params.parentId;

        const existMappingList = await Mapping.findMappingList(parent_id);
        
        const parentInfo = await Parent.getParentEmail(parent_id);
        const parentEmail: string = parentInfo.user['email']

        let mapping_info = [];
        let request_info = [];

        if (existMappingList.length !== 0) {
            // status 값에 따라 매핑 정보인지 요청 정보인지 나눔
            existMappingList.map((m) => {
                
                if (m.status === 1) {
                    mapping_info.push(m);
                }
                else {
                    request_info.push(m);
                }
                
            })

            
            
            // 매핑 정보가 있는 경우
            if (mapping_info.length !== 0) {
                return res.status(200).json({
                    message: "매핑 리스트",
                    mapping_info
                });
            } // 매핑 정보는 없고 요청 정보만 있는 경우
            else if (mapping_info.length === 0 && request_info.length !== 0) {
                return res.status(200).json({
                    message: "보모의 매핑 요청 리스트",
                    request_info,
                    inviteEmail: parentEmail
                })
            }
        }
        // 매핑 정보가 없는 경우
        else {
            return res.status(200).json({
                request_info: [],
                inviteEmail: parentEmail
            })
        }
        
        
    }
    catch(err) {
        res.status(400).json(err);
    }
}

const acceptMapping = async (req: Request, res: Response, next: NextFunction) => {
    const mappingId: number = +req.params.mappingId;

    const mapping_info = await Mapping.findOne({mappingId: mappingId});

    if (mapping_info) {
        await Mapping.update({mappingId: mappingId}, {status: 1})
        .then(() => {
            res.status(200).json({
                message: "보모와 매핑이 완료됨"
            })
        })
        .catch((err) => {
            res.status(400).json(err);
        })
    }
    else {
        return res.status(400).json({
            message: "Invalid maapingId."
        })
    }
}

const rejectMapping = async (req: Request, res: Response, next: NextFunction) => {
    const mappingId: number = +req.params.mappingId;

    const mapping_info = await Mapping.findOne({mappingId: mappingId});

    if (mapping_info) {
        await Mapping.delete({mappingId: mappingId, status: 2})
        .then(() => {
            res.status(200).json({
                message: "보모의 매핑 요청 거절 완료"
            })
        })
        .catch((err) => {
            res.status(400).json(err);
        })
    }
    else {
        return res.status(400).json({
            message: "Invalid maapingId."
        })
    }
}

const getDailyDiary = async (req: Request, res: Response, next: NextFunction) => {
    const mappingId: number = +req.params.mappingId;

    // mappingId를 이용하여 금일 퇴근일지 가져오기
    const daily_work_diary = await WorkDiary.findDiarybyMappingId(mappingId);
    
    const daily_alarm_list = await Alarm.findAlarmbyMappingId(mappingId);

    if (daily_work_diary === undefined) {
        return res.status(404).json({
            message: "금일 작성된 퇴근일지가 존재하지 않습니다."
        });
    }
    else {
        // 가져온 퇴근일지 ID를 이용하여 금일 퇴근일지에 저장된 이미지 리스트 가져오기
        await WorkDiaryImg.findImgbyDiaryId(daily_work_diary.diaryId)
        .then((result) => {
            return res.status(200).json({
                dailyDiary: daily_work_diary,
                dailyImageList: result,
                dailyAlarmList: daily_alarm_list
            })
        })
        .catch((err) => {
            return res.status(400).json(err);
        })
    }
}

const getCalendarDiary = async (req: Request, res: Response, next: NextFunction) => {
    const mappingId: number = +req.params.mappingId;
    const date: string = req.body.date; // ex) 2022-04-14

    // mappingId, 날짜를 이용하여 특정 날짜의 퇴근일지 가져오기
    const calendar_work_diary = await WorkDiary.findCalendarDiary(mappingId, date);
    const calendar_alarm_list = await Alarm.findCalendarAlarmList(mappingId, date);

    // 알람도 없고 퇴근 일지도 없는 경우
    if (calendar_work_diary === undefined && calendar_alarm_list.length === 0) {
        return res.status(200).json({
            CalendarDiary: {
                issue: ""
            },
            CalendarImageList : [],
            CalendarAlarmList: []
        })

    } // 알람은 없고 퇴근 일지만 있는 경우
    else if (calendar_work_diary !== undefined && calendar_alarm_list === []) {
        // 가져온 퇴근일지 ID, 날짜를 이용하여 특정 날짜에 작성된 퇴근일지 이미지 리스트 가져오기
        await WorkDiaryImg.findImgUsingIdAndDate(calendar_work_diary.diaryId, date)
        .then((result) => {
            return res.status(200).json({
                CalendarDiary: calendar_work_diary,
                CalendarImageList: result,
                CalendarAlarmList: []
            })
        })
        .catch((err) => {
            res.status(400).json(err);
        })
    } // 알람은 있는데 퇴근 일지는 없는 경우
    else if (calendar_work_diary === undefined && calendar_alarm_list !== []) {
        return res.status(200).json({
            CalendarAlarmList: calendar_alarm_list,
            CalendarDiary: {issue: ""},
            CalendarImageList: []
        })

    } // 알람, 퇴근일지 전부 있는 경우
    else if (calendar_work_diary !== undefined && calendar_alarm_list !== []) {
        await WorkDiaryImg.findImgUsingIdAndDate(calendar_work_diary.diaryId, date)
        .then((result) => {
            return res.status(200).json({
                CalendarDiary: calendar_work_diary,
                CalendarImageList: result,
                CalendarAlarmList: calendar_alarm_list
            })
        })
        .catch((err) => {
            res.status(400).json(err);
        })
    }
}

const getSensorInfo = async (req: Request, res: Response, next: NextFunction) => {
    const mappingInfo = await Mapping.find({mappingId: 1})

    return res.status(200).json({
        alert: mappingInfo[0].alert
    })

}

const updateSensorInfo = async (req: Request, res: Response, next: NextFunction) => {
    await Mapping.update({mappingId: 1}, {alert: false})
    .then((result) => {
        res.status(200).json({
            message: "success"
        })
    })
}

const updateSensorAlert = async (req: Request, res: Response, next: NextFunction) => {
    await Mapping.update({mappingId: 1}, {alert: true})
    .then((result) => {
        res.status(200).json({
            message: "success"
        })
    })
}

export default {getParentInfo, editParentInfo, createParentInfo, getMainPage, acceptMapping, rejectMapping, getDailyDiary, getCalendarDiary, getSensorInfo, updateSensorInfo, updateSensorAlert};